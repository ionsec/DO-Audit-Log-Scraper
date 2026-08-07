// DO Audit Log Scraper — Playwright e2e.
// Loads the real lib/core.js + contentScript.js into the mock DO security page
// (tests/fixtures/security-page.html) and drives the content-script message
// handler. Pagination to additional "pages" is simulated by a chrome mock that
// serves configurable next-page data (so the page-cap and dedup logic are
// exercised without hitting a real backend).

const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const coreSrc = fs.readFileSync(path.join(ROOT, "lib", "core.js"), "utf8");
const contentSrc = fs.readFileSync(path.join(ROOT, "contentScript.js"), "utf8");

// Minimal chrome mock injected before the content script. `window.__page`
// lets tests control simulated pagination responses.
const MOCK_SRC = `
window.__page = { nextUrl: null, loopData: [] };
window.__onMessage = null;
window.chrome = {
  runtime: {
    onMessage: { addListener(fn) { window.__onMessage = fn; } },
    sendMessage(msg, cb) {
      if (msg && msg.action === "scrapePageInTab") {
        const resp = { data: window.__page.loopData || [], nextUrl: window.__page.nextUrl || null };
        if (typeof cb === "function") cb(resp);
        return Promise.resolve(resp);
      }
      if (window.__onMessage) {
        if (typeof cb === "function") { window.__onMessage(msg, {}, cb); return undefined; }
        return new Promise((resolve) => window.__onMessage(msg, {}, resolve));
      }
      return Promise.resolve(undefined);
    }
  },
  storage: {
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener() {} }
  },
  tabs: { sendMessage: () => Promise.resolve() }
};
`;

function sendMessage(page, message) {
  return page.evaluate(
    (m) => new Promise((resolve) => window.__onMessage(m, {}, resolve)),
    message
  );
}

async function readDownloadBytes(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test.beforeEach(async ({ page }) => {
  // Swallow non-bundle downloads (scrape/filter exports).
  page.on("download", (d) => d.cancel().catch(() => {}));
  await page.addInitScript(MOCK_SRC);
  await page.addInitScript(coreSrc);
  await page.addInitScript(contentSrc);
});

test.describe("single-page scraping", () => {
  test("scrapes all rows from the current page", async ({ page }) => {
    await page.goto("/security-page.html");
    const res = await sendMessage(page, {
      message: "scrape_data",
      options: { format: "csv", allPages: false, deduplicate: true },
    });
    expect(res.success).toBe(true);
    expect(res.count).toBe(3);
    expect(res.pages).toBe(1);
  });
});

test.describe("all-pages pagination", () => {
  test("stops at the page cap on a self-looping next page", async ({ page }) => {
    await page.goto("/security-page.html");
    // Simulate a broken backend that always returns the same next page.
    await page.evaluate(() => {
      window.__page.nextUrl = "https://cloud.digitalocean.com/account/security?page=2";
      window.__page.loopData = [];
    });
    const res = await sendMessage(page, {
      message: "scrape_data",
      options: { format: "csv", allPages: true, deduplicate: true },
    });
    expect(res.success).toBe(true);
    expect(res.pages).toBe(100); // Core.MAX_SCRAPE_PAGES
    expect(res.count).toBe(3); // only the real first-page rows
  });

  test("deduplicates boundary rows repeated across pages (default on)", async ({ page }) => {
    await page.goto("/security-page.html");
    await page.evaluate(() => {
      window.__page.nextUrl = "https://cloud.digitalocean.com/account/security?page=2";
      // page-1 boundary row repeated + one genuinely new row, repeated every page.
      window.__page.loopData = [
        ["create_droplet", "Alice Smith", "203.0.113.1", "3 minutes ago", "2025-06-05T09:15:00Z", "June 5, 2025", "loop"],
        ["create_volume", "Bob Jones", "198.51.100.2", "1 minute ago", "2025-06-06T08:00:00Z", "June 6, 2025", "loop"],
      ];
    });
    const on = await sendMessage(page, {
      message: "scrape_data",
      options: { format: "csv", allPages: true, deduplicate: true },
    });
    expect(on.count).toBe(4); // 3 distinct page-1 rows + 1 new row (99 dupes removed)

    const off = await sendMessage(page, {
      message: "scrape_data",
      options: { format: "csv", allPages: true, deduplicate: false },
    });
    expect(off.count).toBe(3 + 99 * 2); // raw, no dedup
  });
});

test.describe("filtering", () => {
  test("text filter returns matching rows", async ({ page }) => {
    await page.goto("/security-page.html");
    const res = await sendMessage(page, {
      message: "filter_data",
      filters: { User: "alice" },
    });
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
  });

  test("date-range filter returns rows inside the window", async ({ page }) => {
    await page.goto("/security-page.html");
    const res = await sendMessage(page, {
      message: "filter_data",
      filters: {},
      dateRange: { from: "2025-06-02T00:00:00Z", to: "2025-06-02T23:59:59Z" },
    });
    expect(res.success).toBe(true);
    expect(res.count).toBe(1);
    expect(res.data[0][0]).toBe("delete_droplet");
  });
});

test.describe("evidence bundle", () => {
  test("downloads a .zip containing the forensic artifacts", async ({ page }) => {
    await page.goto("/security-page.html");
    page.removeAllListeners("download");
    const dlPromise = page.waitForEvent("download");
    const res = await sendMessage(page, {
      message: "export_bundle",
      options: { allPages: false, includeHash: true, includeMetadata: true, deduplicate: true },
    });
    const download = await dlPromise;

    expect(res.success).toBe(true);
    expect(res.count).toBe(3);
    expect(download.suggestedFilename()).toMatch(/\.zip$/);

    const buf = await readDownloadBytes(download);
    const ascii = buf.toString("latin1");
    expect(ascii.slice(0, 2)).toBe("PK"); // ZIP signature
    for (const name of ["README.txt", "audit_logs.csv", "audit_logs.json", "metadata.json", "SHA256SUMS.txt"]) {
      expect(ascii).toContain(name);
    }
  });
});
