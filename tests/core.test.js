// DO Audit Log Scraper — unit tests for lib/core.js (pure logic).
const Core = require("../lib/core.js");

const HEADERS = ["Action", "User", "IP Address", "Time", "UTC_Timestamp", "Local_Timestamp", "Scraped_At_UTC"];

describe("sanitiseCSVCell / escapeCSV", () => {
  test("prefixes dangerous formula-injection starters with a tab", () => {
    expect(Core.sanitiseCSVCell("=SUM(A1)")).toBe("\t=SUM(A1)");
    expect(Core.sanitiseCSVCell("+cmd")).toBe("\t+cmd");
    expect(Core.sanitiseCSVCell("-x")).toBe("\t-x");
    expect(Core.sanitiseCSVCell("@import")).toBe("\t@import");
  });

  test("leaves safe values unchanged", () => {
    expect(Core.sanitiseCSVCell("plain")).toBe("plain");
    expect(Core.sanitiseCSVCell("123")).toBe("123");
    expect(Core.sanitiseCSVCell(null)).toBe("");
    expect(Core.sanitiseCSVCell(undefined)).toBe("");
  });

  test("quotes fields containing commas, quotes, or newlines (RFC 4180)", () => {
    expect(Core.escapeCSV('a,"b')).toBe('"a,""b"');
    expect(Core.escapeCSV("x,y")).toBe('"x,y"');
    expect(Core.escapeCSV("line1\nline2")).toBe('"line1\nline2"');
    expect(Core.escapeCSV("safe")).toBe("safe");
  });
});

describe("generateSHA256", () => {
  test("produces the known SHA-256 vector for an empty string", async () => {
    // SHA-256("") == e3b0c442...
    expect(await Core.generateSHA256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  test("produces a 64-char hex digest", async () => {
    const h = await Core.generateSHA256("hello");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("filterAuditLogs", () => {
  const data = [
    ["login", "Alice Smith", "203.0.113.1", "x", "t1", "l1", "s1"],
    ["delete_droplet", "Bob Jones", "198.51.100.2", "x", "t2", "l2", "s2"],
    ["create_droplet", "Alice Smith", "203.0.113.1", "x", "t3", "l3", "s3"],
  ];

  test("returns all rows when no filters", () => {
    expect(Core.filterAuditLogs(data, HEADERS, {})).toHaveLength(3);
  });

  test("filters by user substring (case-insensitive)", () => {
    expect(Core.filterAuditLogs(data, HEADERS, { User: "alice" })).toHaveLength(2);
  });

  test("filters by action", () => {
    expect(Core.filterAuditLogs(data, HEADERS, { Action: "delete_droplet" })).toHaveLength(1);
  });

  test("filters by IP", () => {
    expect(Core.filterAuditLogs(data, HEADERS, { "IP Address": "198.51.100.2" })).toHaveLength(1);
  });

  test("combines filters with AND", () => {
    expect(
      Core.filterAuditLogs(data, HEADERS, { User: "alice", Action: "login" })
    ).toHaveLength(1);
  });
});

describe("filterAuditLogsByDateRange", () => {
  const data = [
    ["a", "u", "ip", "x", "2025-06-01T10:00:00Z", "l", "s"],
    ["b", "u", "ip", "x", "2025-06-02T11:30:00Z", "l", "s"],
    ["c", "u", "ip", "x", "2025-06-05T09:15:00Z", "l", "s"],
  ];

  test("returns all rows when no bounds given", () => {
    expect(Core.filterAuditLogsByDateRange(data, HEADERS, {})).toHaveLength(3);
    expect(Core.filterAuditLogsByDateRange(data, HEADERS, null)).toHaveLength(3);
  });

  test("filters by both bounds (inclusive)", () => {
    const out = Core.filterAuditLogsByDateRange(data, HEADERS, {
      from: "2025-06-02T00:00:00Z",
      to: "2025-06-03T00:00:00Z",
    });
    expect(out.map((r) => r[0])).toEqual(["b"]);
  });

  test("from-only bound includes everything after", () => {
    const out = Core.filterAuditLogsByDateRange(data, HEADERS, {
      from: "2025-06-05T00:00:00Z",
    });
    expect(out.map((r) => r[0])).toEqual(["c"]);
  });

  test("to-only bound includes everything before", () => {
    const out = Core.filterAuditLogsByDateRange(data, HEADERS, {
      to: "2025-06-02T12:00:00Z",
    });
    expect(out.map((r) => r[0])).toEqual(["a", "b"]);
  });

  test("returns empty when the range is entirely past the data", () => {
    const out = Core.filterAuditLogsByDateRange(data, HEADERS, {
      from: "2026-01-01T00:00:00Z",
    });
    expect(out).toHaveLength(0);
  });

  test("returns all rows when bounds are invalid/unparseable", () => {
    expect(
      Core.filterAuditLogsByDateRange(data, HEADERS, { from: "not-a-date" })
    ).toHaveLength(3);
  });

  test("excludes rows with missing/unparseable timestamps when a bound is set", () => {
    const rows = [
      ["a", "u", "ip", "x", "N/A", "l", "s"],
      ["b", "u", "ip", "x", "2025-06-02T11:30:00Z", "l", "s"],
    ];
    const out = Core.filterAuditLogsByDateRange(rows, HEADERS, {
      from: "2025-06-01T00:00:00Z",
    });
    expect(out.map((r) => r[0])).toEqual(["b"]);
  });
});

describe("deduplicateRows", () => {
  test("collapses repeated source rows regardless of Scraped_At_UTC", () => {
    const data = [
      ["login", "Alice", "1.2.3.4", "t", "2025-06-01T10:00:00Z", "l", "s1"],
      ["login", "Alice", "1.2.3.4", "t", "2025-06-01T10:00:00Z", "l", "s2"], // repeat, different scrape time
      ["create", "Bob", "5.6.7.8", "t", "2025-06-02T09:00:00Z", "l", "s3"],
    ];
    const out = Core.deduplicateRows(data, HEADERS, { enabled: true });
    expect(out).toHaveLength(2);
  });

  test("keeps distinct rows that share only Scraped_At", () => {
    const data = [
      ["login", "Alice", "1.2.3.4", "t", "2025-06-01T10:00:00Z", "l", "s"],
      ["delete", "Bob", "5.6.7.8", "t", "2025-06-01T11:00:00Z", "l", "s"],
    ];
    expect(Core.deduplicateRows(data, HEADERS, { enabled: true })).toHaveLength(2);
  });

  test("returns the original array when disabled", () => {
    const data = [["a", "b", "c", "d", "e", "f", "g"], ["a", "b", "c", "d", "e", "f", "g"]];
    expect(Core.deduplicateRows(data, HEADERS, { enabled: false })).toHaveLength(2);
  });

  test("honours an explicit keyColumns list", () => {
    const data = [
      ["login", "Alice", "1.2.3.4", "t", "2025-06-01T10:00:00Z", "l", "s"],
      ["logout", "Alice", "1.2.3.4", "t", "2025-06-01T10:00:00Z", "l", "s"],
    ];
    // Key on User only -> both collapse to one.
    expect(Core.deduplicateRows(data, HEADERS, { enabled: true, keyColumns: ["User"] })).toHaveLength(1);
  });
});

describe("nextUrlWithCap", () => {
  const allowed = "https://cloud.digitalocean.com";

  test("returns the url when under the cap and origin matches", () => {
    expect(Core.nextUrlWithCap("https://cloud.digitalocean.com/security?page=2", 1, { allowedOrigin: allowed })).toBe(
      "https://cloud.digitalocean.com/security?page=2"
    );
  });

  test("returns null when the cap is reached", () => {
    expect(Core.nextUrlWithCap("https://cloud.digitalocean.com/x", 100, { maxPages: 100, allowedOrigin: allowed })).toBeNull();
  });

  test("returns null for a disallowed origin", () => {
    expect(Core.nextUrlWithCap("https://evil.example.com/x", 1, { allowedOrigin: allowed })).toBeNull();
  });

  test("returns null for a malformed URL", () => {
    expect(Core.nextUrlWithCap("not a url", 1, { allowedOrigin: allowed })).toBeNull();
  });

  test("returns null for empty url", () => {
    expect(Core.nextUrlWithCap(null, 1, { allowedOrigin: allowed })).toBeNull();
  });
});

describe("validateScheduleMinutes", () => {
  test("clamps to the minimum of 1", () => {
    expect(Core.validateScheduleMinutes(0)).toBe(1);
    expect(Core.validateScheduleMinutes(-5)).toBe(1);
  });

  test("clamps to the maximum of 10080", () => {
    expect(Core.validateScheduleMinutes(999999)).toBe(10080);
  });

  test("floors fractional values and keeps valid integers", () => {
    expect(Core.validateScheduleMinutes(0.5)).toBe(1);
    expect(Core.validateScheduleMinutes(60)).toBe(60);
  });

  test("treats non-numeric input as invalid (min)", () => {
    expect(Core.validateScheduleMinutes("abc")).toBe(1);
    expect(Core.validateScheduleMinutes(NaN)).toBe(1);
  });
});

describe("sanitiseZipEntryName", () => {
  test("strips path-traversal segments", () => {
    expect(Core.sanitiseZipEntryName("../../etc/passwd")).toBe("etc/passwd");
    expect(Core.sanitiseZipEntryName("../a/./b/../c")).toBe("a/b/c");
  });

  test("normalises backslashes", () => {
    expect(Core.sanitiseZipEntryName("..\\..\\evil.txt")).toBe("evil.txt");
  });

  test("strips control characters", () => {
    expect(Core.sanitiseZipEntryName("a b.txt")).toBe("ab.txt");
  });

  test("falls back to a safe name for empty input", () => {
    expect(Core.sanitiseZipEntryName("")).toBe("unnamed");
    expect(Core.sanitiseZipEntryName("/")).toBe("unnamed");
  });
});

describe("crc32", () => {
  const enc = new TextEncoder();

  test("matches the standard test vector for '123456789'", () => {
    expect(Core.crc32(enc.encode("123456789"))).toBe(0xcbf43926);
  });

  test("is deterministic for identical input", () => {
    expect(Core.crc32(enc.encode("audit log"))).toBe(Core.crc32(enc.encode("audit log")));
  });
});

describe("buildZip", () => {
  const enc = new TextEncoder();

  test("produces a well-formed STORE archive", () => {
    const bytes = Core.buildZip([
      { name: "a.txt", data: enc.encode("hello") },
      { name: "dir/b.csv", data: enc.encode("a,b\n1,2") },
    ]);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'

    // End-of-central-directory signature present at expected offset.
    const eocdOffset = bytes.length - 22;
    expect(bytes[eocdOffset]).toBe(0x50);
    expect(bytes[eocdOffset + 1]).toBe(0x4b);
    expect(bytes[eocdOffset + 2]).toBe(0x05);
    expect(bytes[eocdOffset + 3]).toBe(0x06);

    // Raw filenames must appear in the archive.
    const ascii = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
    expect(ascii).toContain("a.txt");
    expect(ascii).toContain("dir/b.csv");
  });

  test("central directory entry count matches the file count", () => {
    const bytes = Core.buildZip([
      { name: "x.txt", data: enc.encode("x") },
      { name: "y.txt", data: enc.encode("y") },
    ]);
    const eocdOffset = bytes.length - 22;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // entries on this disk (offset 8) and total entries (offset 10)
    expect(dv.getUint16(eocdOffset + 8, true)).toBe(2);
    expect(dv.getUint16(eocdOffset + 10, true)).toBe(2);
  });

  test("sanitises unsafe entry names inside the archive", () => {
    const bytes = Core.buildZip([{ name: "../../evil.txt", data: enc.encode("x") }]);
    const ascii = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
    expect(ascii).not.toContain("..");
    expect(ascii).toContain("evil.txt");
  });
});

describe("buildEvidenceBundle", () => {
  test("bundles the five artifacts under a single base directory", () => {
    const enc = new TextEncoder();
    const bytes = Core.buildEvidenceBundle({
      baseName: "do_audit_log_evidence",
      csv: "Action,User\nlogin,Alice",
      json: '{"auditLogs":[]}',
      metadata: '{"tool":"DO Audit Log Scraper"}',
      hash: "abc  audit_logs.csv\n",
      readme: "README",
    });
    const ascii = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
    for (const name of [
      "do_audit_log_evidence/README.txt",
      "do_audit_log_evidence/audit_logs.csv",
      "do_audit_log_evidence/audit_logs.json",
      "do_audit_log_evidence/metadata.json",
      "do_audit_log_evidence/SHA256SUMS.txt",
    ]) {
      expect(ascii).toContain(name);
    }
  });
});
