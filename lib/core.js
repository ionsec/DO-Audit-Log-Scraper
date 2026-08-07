// DO Audit Log Scraper — lib/core.js (v2.2)
// Pure, DOM/chrome-free logic shared by the content script and the Jest test suite.
// Loaded as a plain <script> (defines globalThis.DOAuditCore) OR as a CommonJS
// module (module.exports) so `require("../lib/core.js")` works in Jest.
//
// Scope rule: this file MUST NOT touch `document`, `window`, `navigator`, or
// `chrome.*`. Anything that needs the page or the extension runtime belongs in
// contentScript.js / background.js.

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DOAuditCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Hard cap on the number of pages scraped in one "all pages" run. Guards
  // against an infinite pagination loop (see nextUrlWithCap / scrapeAllPages).
  const MAX_SCRAPE_PAGES = 100;
  const MAX_SCHEDULE_MINUTES = 7 * 24 * 60; // 7 days
  const MAX_SCHEDULE_MINUTES_STR = String(MAX_SCHEDULE_MINUTES);

  // ─── SHA-256 ──────────────────────────────────────────────────────────────
  async function generateSHA256(data) {
    const subtle = globalThis.crypto && crypto.subtle ? crypto.subtle : null;
    if (!subtle) {
      throw new Error("crypto.subtle is not available in this environment");
    }
    const dataBuffer = new TextEncoder().encode(String(data));
    const hashBuffer = await subtle.digest("SHA-256", dataBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // ─── CSV Sanitisation (formula-injection protection) ──────────────────────
  function sanitiseCSVCell(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    // Prevent CSV formula injection: prefix dangerous chars with a tab.
    if (/^[=+\-@\t\r]/.test(str)) {
      return "\t" + str;
    }
    return str;
  }

  function escapeCSV(value) {
    const str = sanitiseCSVCell(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // ─── Search / Filter (text) ──────────────────────────────────────────────
  function filterAuditLogs(data, headers, filters) {
    if (!filters || Object.keys(filters).length === 0) return data;

    return data.filter((row) =>
      Object.keys(filters).every((key) => {
        const value = filters[key];
        const colIndex = headers.indexOf(key);
        if (colIndex === -1) return true;
        if (!value) return true;
        const cellValue = String(row[colIndex]).toLowerCase();
        return cellValue.includes(String(value).toLowerCase());
      })
    );
  }

  // ─── Filter by UTC timestamp range ───────────────────────────────────────
  // Compares against the UTC_Timestamp column (ISO 8601). Accepts `from`/`to`
  // as any Date.parse()-able string (popup datetime-local values included).
  // Empty/invalid bounds are treated as "no bound". A row whose timestamp is
  // missing or unparseable is excluded when any bound is active.
  function filterAuditLogsByDateRange(data, headers, options) {
    options = options || {};
    const colIndex = headers.indexOf("UTC_Timestamp");
    if (colIndex === -1) return data;

    const fromTime = options.from ? Date.parse(options.from) : NaN;
    const toTime = options.to ? Date.parse(options.to) : NaN;
    const hasFrom = Number.isFinite(fromTime);
    const hasTo = Number.isFinite(toTime);
    if (!hasFrom && !hasTo) return data;

    return data.filter((row) => {
      const cell = row[colIndex];
      if (cell === undefined || cell === null || cell === "N/A") return false;
      const t = Date.parse(String(cell));
      if (!Number.isFinite(t)) return false;
      if (hasFrom && t < fromTime) return false;
      if (hasTo && t > toTime) return false;
      return true;
    });
  }

  // ─── Cross-page deduplication ────────────────────────────────────────────
  // keyColumns (optional array of column names) overrides the default key.
  // Default: the source columns BEFORE the 3 appended headers
  // (UTC_Timestamp, Local_Timestamp, Scraped_At_UTC). Scraped_At_UTC differs
  // every scrape, so it is deliberately excluded from the key.
  function deduplicateRows(data, headers, options) {
    options = options || {};
    if (options.enabled === false) return data;

    let keyIndexes = null;
    if (Array.isArray(options.keyColumns) && options.keyColumns.length) {
      const mapped = options.keyColumns
        .map((name) => headers.indexOf(name))
        .filter((i) => i !== -1);
      if (mapped.length) keyIndexes = mapped;
    }

    const sourceCount =
      keyIndexes || (headers.length > 3 ? headers.length - 3 : headers.length);

    const seen = new Set();
    return data.filter((row) => {
      let key;
      if (Array.isArray(keyIndexes)) {
        key = JSON.stringify(
          keyIndexes.map((i) => {
            return row[i];
          })
        );
      } else {
        key = JSON.stringify(row.slice(0, sourceCount));
      }
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ─── Pagination guard ────────────────────────────────────────────────────
  // Returns a validated next-page URL, or null when the origin is not allowed,
  // the URL is malformed, or the page cap has been reached.
  function nextUrlWithCap(currentUrl, visitedCount, options) {
    options = options || {};
    const maxPages = options.maxPages || MAX_SCRAPE_PAGES;
    if (visitedCount >= maxPages) return null;
    if (!currentUrl) return null;
    let parsed;
    try {
      parsed = new URL(currentUrl);
    } catch {
      return null;
    }
    if (options.allowedOrigin && parsed.origin !== options.allowedOrigin) {
      return null;
    }
    return parsed.href;
  }

  // ─── Schedule bounds ─────────────────────────────────────────────────────
  // Clamp an interval (minutes) to [1, 10080] (1 minute – 7 days).
  function validateScheduleMinutes(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return 1;
    return Math.min(Math.max(Math.floor(v), 1), MAX_SCHEDULE_MINUTES);
  }

  // ─── ZIP (dependency-free, STORE method) ─────────────────────────────────
  // CRC-32 (IEEE 802.3), table-based. Standard test vector:
  //   crc32("123456789") === 0xCBF43926.
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Removes path-traversal / control characters from a ZIP entry name.
  function sanitiseZipEntryName(name) {
    let s = String(name || "").replace(/\\/g, "/");
    s = s
      .split("/")
      .filter((seg) => seg !== "" && seg !== "." && seg !== "..")
      .join("/");
    // Strip control characters (including NUL) that are unsafe in file names.
    // eslint-disable-next-line no-control-regex -- matching C0/DEL is the intent.
    s = s.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    return s || "unnamed";
  }

  // Builds a STORE (uncompressed) ZIP archive from [{ name, data }] where data
  // is a Uint8Array or a string. Returns a Uint8Array.
  function buildZip(entries) {
    const enc = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    const centralSizes = [];
    let offset = 0;
    const count = entries.length;

    for (let i = 0; i < count; i++) {
      const entry = entries[i];
      const nameBytes = enc.encode(sanitiseZipEntryName(entry.name));
      const data =
        entry.data instanceof Uint8Array ? entry.data : enc.encode(String(entry.data));
      const crc = crc32(data);
      const size = data.length;

      // Local file header (30 bytes fixed + name)
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); // signature
      local.setUint16(4, 20, true); // version needed to extract
      local.setUint16(6, 0x0800, true); // flags: UTF-8 names
      local.setUint16(8, 0, true); // method: 0 = store
      local.setUint16(10, 0, true); // mod time
      local.setUint16(12, 0x21, true); // mod date (arbitrary)
      local.setUint32(14, crc, true);
      local.setUint32(18, size, true); // compressed size
      local.setUint32(22, size, true); // uncompressed size
      local.setUint16(26, nameBytes.length, true); // name length
      local.setUint16(28, 0, true); // extra length
      const localBytes = new Uint8Array(local.buffer);
      const localWithName = new Uint8Array(localBytes.length + nameBytes.length);
      localWithName.set(localBytes, 0);
      localWithName.set(nameBytes, localBytes.length);
      localParts.push(localWithName, data);

      // Central directory header (46 bytes fixed + name)
      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014b50, true); // signature
      central.setUint16(4, 20, true); // version made by
      central.setUint16(6, 20, true); // version needed
      central.setUint16(8, 0x0800, true); // flags
      central.setUint16(10, 0, true); // method
      central.setUint16(12, 0, true); // mod time
      central.setUint16(14, 0x21, true); // mod date
      central.setUint32(16, crc, true);
      central.setUint32(20, size, true);
      central.setUint32(24, size, true);
      central.setUint16(28, nameBytes.length, true);
      central.setUint16(30, 0, true); // extra length
      central.setUint16(32, 0, true); // comment length
      central.setUint16(34, 0, true); // disk number start
      central.setUint16(36, 0, true); // internal attrs
      central.setUint32(38, 0, true); // external attrs
      central.setUint32(42, offset, true); // local header offset
      const centralBytes = new Uint8Array(central.buffer);
      const centralWithName = new Uint8Array(centralBytes.length + nameBytes.length);
      centralWithName.set(centralBytes, 0);
      centralWithName.set(nameBytes, centralBytes.length);
      centralParts.push(centralWithName);
      centralSizes.push(centralWithName.length);

      offset += localWithName.length + data.length;
    }

    const centralSize = centralSizes.reduce((a, b) => a + b, 0);
    const centralOffset = offset;

    // End of central directory (22 bytes)
    const eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true); // signature
    eocd.setUint16(4, 0, true); // disk number
    eocd.setUint16(6, 0, true); // cd start disk
    eocd.setUint16(8, count, true); // entries on this disk
    eocd.setUint16(10, count, true); // total entries
    eocd.setUint32(12, centralSize, true);
    eocd.setUint32(16, centralOffset, true);
    eocd.setUint16(20, 0, true); // comment length

    const totalLength = centralOffset + centralSize + 22;
    const out = new Uint8Array(totalLength);
    let pos = 0;
    for (const part of localParts) {
      out.set(part, pos);
      pos += part.length;
    }
    for (const part of centralParts) {
      out.set(part, pos);
      pos += part.length;
    }
    out.set(new Uint8Array(eocd.buffer), pos);

    return out;
  }

  // Assemble the forensic evidence bundle and return ZIP bytes.
  // artifacts: { baseName, csv, json, metadata, hash, readme }
  function buildEvidenceBundle(artifacts) {
    const enc = new TextEncoder();
    const baseName = sanitiseZipEntryName(artifacts.baseName || "do_audit_log_evidence");
    const entries = [
      { name: baseName + "/README.txt", data: artifacts.readme || "" },
      { name: baseName + "/audit_logs.csv", data: artifacts.csv || "" },
      { name: baseName + "/audit_logs.json", data: artifacts.json || "[]" },
      { name: baseName + "/metadata.json", data: artifacts.metadata || "{}" },
      { name: baseName + "/SHA256SUMS.txt", data: artifacts.hash || "" },
    ];
    // Re-encode to Uint8Array explicitly for deterministic CRC.
    for (const entry of entries) {
      entry.data = enc.encode(String(entry.data));
    }
    return buildZip(entries);
  }

  return {
    MAX_SCRAPE_PAGES,
    MAX_SCHEDULE_MINUTES,
    MAX_SCHEDULE_MINUTES_STR,
    generateSHA256,
    sanitiseCSVCell,
    escapeCSV,
    filterAuditLogs,
    filterAuditLogsByDateRange,
    deduplicateRows,
    nextUrlWithCap,
    validateScheduleMinutes,
    crc32,
    sanitiseZipEntryName,
    buildZip,
    buildEvidenceBundle,
  };
});
