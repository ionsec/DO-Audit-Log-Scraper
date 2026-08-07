// DO Audit Log Scraper v2.2 — Forensic Edition
// Content script. Pure logic lives in lib/core.js (globalThis.DOAuditCore).
// v2.2 adds: cross-page dedup, page-cap guard, date-range filter, automated
// scheduling, and a self-contained .zip evidence bundle.

const EXT_VERSION = "2.2";
const DO_SECURITY_ORIGIN = "https://cloud.digitalocean.com";
const Core = globalThis.DOAuditCore;

// ─── Data Extraction ────────────────────────────────────────────────────
function extractAuditLogData() {
  try {
    const table = document.querySelector("table");
    if (!table) {
      console.error("No audit log table found on page");
      return null;
    }

    const headerRow = table.querySelector("thead tr");
    if (!headerRow) {
      console.error("No header row found in table");
      return null;
    }

    const headers = Array.from(headerRow.querySelectorAll("th")).map((cell) =>
      cell.textContent.trim()
    );
    headers.push("UTC_Timestamp", "Local_Timestamp", "Scraped_At_UTC");

    const dataRows = Array.from(table.querySelectorAll("tbody tr"));
    if (dataRows.length === 0) {
      console.warn("No audit log entries found");
      return { headers, data: [], count: 0 };
    }

    const scrapedAt = new Date().toISOString();

    const data = dataRows
      .map((row) => {
        try {
          const cells = Array.from(row.querySelectorAll("td"));
          const rowData = cells.map((cell) => {
            const link = cell.querySelector("a");
            if (link) return link.textContent.trim() || "N/A";
            const content = cell.textContent.trim();
            return content === "" ? "N/A" : content;
          });

          const timeElement = row.querySelector(".created_at time, time");
          const dateTime = timeElement ? timeElement.getAttribute("datetime") : "N/A";

          const tooltipElement = row.querySelector("[data-original-title], [title]");
          const localTime = tooltipElement
            ? tooltipElement.getAttribute("data-original-title") ||
              tooltipElement.getAttribute("title") ||
              "N/A"
            : "N/A";

          rowData.push(dateTime);
          rowData.push(localTime);
          rowData.push(scrapedAt);
          return rowData;
        } catch (err) {
          console.error("Error extracting row data:", err);
          return null;
        }
      })
      .filter((row) => row !== null);

    return { headers, data, count: data.length };
  } catch (error) {
    console.error("Error in extractAuditLogData:", error);
    return null;
  }
}

// ─── Pagination ─────────────────────────────────────────────────────────
function getNextPageUrl() {
  const selectors = [
    "a[rel='next']",
    ".pagination .next a",
    ".pagination .next:not(.disabled) a",
    'button[aria-label="Next"]',
  ];
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el && !el.classList.contains("disabled") && el.href) {
        try {
          const url = new URL(el.href, DO_SECURITY_ORIGIN);
          if (url.origin === DO_SECURITY_ORIGIN) {
            return url.href;
          }
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  const links = document.querySelectorAll(".pagination a, nav a");
  for (const link of links) {
    if (
      link.textContent.trim().toLowerCase() === "next" &&
      !link.classList.contains("disabled") &&
      link.href
    ) {
      try {
        const url = new URL(link.href, DO_SECURITY_ORIGIN);
        if (url.origin === DO_SECURITY_ORIGIN) return url.href;
      } catch {
        continue;
      }
    }
  }

  return null;
}

// ─── CSV Formatting ─────────────────────────────────────────────────────
function formatAsCSV(headers, data) {
  const csvHeaders = headers.map(Core.escapeCSV).join(",");
  const csvRows = data.map((row) => row.map(Core.escapeCSV).join(","));
  return [csvHeaders, ...csvRows].join("\n");
}

// ─── Forensic Metadata ─────────────────────────────────────────────────
async function createForensicMetadata(data, options) {
  const metadata = {
    tool: "DO Audit Log Scraper",
    version: EXT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: "IONSEC Forensic Tools",
    source: "DigitalOcean Security Audit Logs",
    sourceUrl: window.location.href,
    recordCount: data.length,
    browserInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    },
    options: {
      format: options.format,
      includeMetadata: options.includeMetadata,
      includeHash: options.includeHash,
      timestampFilename: options.timestampFilename,
      allPages: options.allPages,
      deduplicate: options.deduplicate,
    },
  };

  if (options.includeHash) {
    const dataString = JSON.stringify(data);
    metadata.dataHash = {
      algorithm: "SHA-256",
      value: await Core.generateSHA256(dataString),
    };
  }

  return metadata;
}

// ─── Filename Generation ────────────────────────────────────────────────
function generateFilename(format, includeTimestamp) {
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}`
    : "";
  return `do_audit_logs${timestamp}.${format}`;
}

// ─── Download helpers ───────────────────────────────────────────────────
async function downloadBytes(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadData(data, filename, format) {
  let content;
  let mimeType;

  if (format === "json") {
    content = JSON.stringify(data, null, 2);
    mimeType = "application/json";
  } else {
    content = data;
    mimeType = "text/csv;charset=utf-8";
  }

  return downloadBytes(content, filename, mimeType);
}

// ─── Pagination via background messaging ───────────────────────────────
// Origin-validated and capped at Core.MAX_SCRAPE_PAGES to prevent runaway
// scraping if pagination ever fails to terminate.
async function scrapeAllPages(options, firstPageData) {
  const nextUrl = getNextPageUrl();
  const guard = (url, count) =>
    Core.nextUrlWithCap(url, count, {
      maxPages: Core.MAX_SCRAPE_PAGES,
      allowedOrigin: DO_SECURITY_ORIGIN,
    });

  let currentUrl = guard(nextUrl, 1);
  if (!currentUrl) {
    return { data: firstPageData.data, headers: firstPageData.headers, pages: 1 };
  }

  let allData = [...firstPageData.data];
  const headers = firstPageData.headers;
  let pages = 1;

  while (currentUrl) {
    pages++;
    const result = await chrome.runtime.sendMessage({
      action: "scrapePageInTab",
      url: currentUrl,
    });

    if (result && result.data && result.data.length > 0) {
      allData.push(...result.data);
    }

    const nextFromPage = result ? result.nextUrl : null;
    currentUrl = guard(nextFromPage, pages);
  }

  // Cross-page deduplication (boundary rows repeat across page turns).
  if (options.deduplicate !== false) {
    allData = Core.deduplicateRows(allData, headers, { enabled: true });
  }

  return { data: allData, headers, pages };
}

// ─── Main Scrape Function ──────────────────────────────────────────────
async function scrapeData(options = {}) {
  try {
    console.log("Starting audit log scrape with options:", options);

    const {
      format = "csv",
      includeMetadata = true,
      timestampFilename = true,
      allPages = false,
      deduplicate = true,
    } = options;

    // Load persisted defaults for any undefined options
    const stored = await chrome.storage.local.get("exportOptions").catch(() => ({}));
    const defaults = stored.exportOptions || {};

    const resolvedOptions = {
      format: options.format ?? defaults.format ?? "csv",
      includeMetadata: options.includeMetadata ?? defaults.includeMetadata ?? true,
      includeHash: options.includeHash ?? defaults.includeHash ?? true,
      timestampFilename: options.timestampFilename ?? defaults.timestampFilename ?? true,
      allPages,
      deduplicate,
    };

    const pageData = extractAuditLogData();
    if (!pageData) {
      throw new Error("Failed to extract audit log data");
    }

    let allHeaders = pageData.headers;
    let allData = pageData.data;
    let pageCount = 1;

    if (allPages) {
      const paginated = await scrapeAllPages(resolvedOptions, pageData);
      allData = paginated.data;
      allHeaders = paginated.headers;
      pageCount = paginated.pages;
    }

    console.log(`Scraped ${allData.length} total entries from ${pageCount} page(s)`);

    const filename = generateFilename(format, timestampFilename);
    let exportData;

    if (format === "json") {
      exportData = {
        auditLogs: allData.map((row) => {
          const obj = {};
          allHeaders.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        }),
      };

      if (includeMetadata) {
        const metadata = await createForensicMetadata(
          exportData.auditLogs,
          resolvedOptions
        );
        exportData.metadata = metadata;
      }
    } else {
      exportData = formatAsCSV(allHeaders, allData);
      if (includeMetadata) {
        const metadata = await createForensicMetadata(allData, resolvedOptions);
        const metadataLines = [
          "# Forensic Metadata",
          `# Tool: ${metadata.tool} v${metadata.version}`,
          `# Exported: ${metadata.exportedAt}`,
          `# Source: ${metadata.source}`,
          `# URL: ${metadata.sourceUrl}`,
          `# Records: ${metadata.recordCount}`,
          `# Browser: ${metadata.browserInfo.userAgent}`,
          `# Platform: ${metadata.browserInfo.platform}`,
          `# Language: ${metadata.browserInfo.language}`,
        ];
        if (metadata.dataHash) {
          metadataLines.push(
            `# Hash (${metadata.dataHash.algorithm}): ${metadata.dataHash.value}`
          );
        }
        exportData = metadataLines.join("\n") + "\n" + exportData;
      }
    }

    if (format === "csv") {
      exportData = "\uFEFF" + exportData;
    }

    await downloadData(exportData, filename, format);

    return { success: true, count: allData.length, pages: pageCount };
  } catch (error) {
    console.error("Scraping error:", error);
    return { success: false, error: error.message };
  }
}

// ─── Evidence Bundle (.zip) ─────────────────────────────────────────────
async function exportEvidenceBundle(options = {}) {
  try {
    const {
      allPages = false,
      includeMetadata = true,
      includeHash = true,
      deduplicate = true,
    } = options;

    const pageData = extractAuditLogData();
    if (!pageData) throw new Error("Failed to extract audit log data");

    let allHeaders = pageData.headers;
    let allData = pageData.data;
    let pages = 1;

    if (allPages) {
      const paginated = await scrapeAllPages(options, pageData);
      allData = paginated.data;
      allHeaders = paginated.headers;
      pages = paginated.pages;
    } else if (deduplicate) {
      allData = Core.deduplicateRows(allData, allHeaders, { enabled: true });
    }

    const csv = formatAsCSV(allHeaders, allData);
    const jsonRows = allData.map((row) => {
      const obj = {};
      allHeaders.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    const json = JSON.stringify({ auditLogs: jsonRows }, null, 2);

    const metadata = await createForensicMetadata(jsonRows, options);
    const baseName = `do_audit_log_evidence_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5)}`;

    const readme = [
      "DO Audit Log Scraper — Forensic Evidence Bundle",
      `Exported: ${metadata.exportedAt}`,
      `Tool: ${metadata.tool} v${metadata.version}`,
      `Source: ${metadata.source}`,
      `Pages: ${pages}, Records: ${allData.length}`,
      "Verify file integrity against SHA256SUMS.txt before sharing.",
    ].join("\n");

    let hashManifest = "";
    if (includeHash) {
      const csvHash = await Core.generateSHA256(csv);
      const jsonHash = await Core.generateSHA256(json);
      hashManifest = [
        "# SHA-256 integrity manifest",
        `${csvHash}  audit_logs.csv`,
        `${jsonHash}  audit_logs.json`,
        "",
      ].join("\n");
    }

    const zipBytes = Core.buildEvidenceBundle({
      baseName,
      csv,
      json,
      metadata: includeMetadata ? JSON.stringify(metadata, null, 2) : "{}",
      hash: hashManifest,
      readme,
    });

    await downloadBytes(zipBytes, `${baseName}.zip`, "application/zip");
    return { success: true, count: allData.length, pages };
  } catch (error) {
    console.error("Bundle error:", error);
    return { success: false, error: error.message };
  }
}

// ─── Automated Scheduling ───────────────────────────────────────────────
let scheduleTimer = null;
let scheduleInFlight = false;

function stopSchedule() {
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }
}

async function applySchedule() {
  const stored = await chrome.storage.local.get("scheduleConfig").catch(() => ({}));
  const cfg = stored.scheduleConfig;
  stopSchedule();

  if (cfg && cfg.enabled) {
    const minutes = Core.validateScheduleMinutes(cfg.intervalMinutes || 0);
    const ms = minutes * 60 * 1000;
    scheduleTimer = setInterval(async () => {
      if (scheduleInFlight) return; // re-entrancy guard: skip overlapping ticks
      scheduleInFlight = true;
      try {
        const opts = {
          format: cfg.format || "csv",
          includeMetadata: cfg.includeMetadata !== false,
          includeHash: cfg.includeHash !== false,
          timestampFilename: cfg.timestampFilename !== false,
          allPages: !!cfg.allPages,
          deduplicate: cfg.deduplicate !== false,
        };
        await scrapeData(opts);
      } finally {
        scheduleInFlight = false;
      }
    }, ms);
  }
}

// React to schedule changes made by the popup (or externally).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.scheduleConfig) {
    applySchedule();
  }
});

// ─── MutationObserver — real-time monitoring ────────────────────────────
let observer = null;
let lastRowCount = 0;

function startMonitoring() {
  const table = document.querySelector("table tbody");
  if (!table) return;

  lastRowCount = table.querySelectorAll("tr").length;

  observer = new MutationObserver((_mutations) => {
    const currentCount = table.querySelectorAll("tr").length;
    if (currentCount > lastRowCount) {
      const newEntries = currentCount - lastRowCount;
      lastRowCount = currentCount;
      chrome.runtime.sendMessage({
        action: "newEntriesDetected",
        count: newEntries,
        timestamp: new Date().toISOString(),
      });
    }
  });

  observer.observe(table, { childList: true, subtree: true });
}

function stopMonitoring() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// ─── Page Stats ────────────────────────────────────────────────────────
function getPageStats() {
  try {
    const dataRows = document.querySelectorAll("table tbody tr");
    return {
      rowCount: dataRows.length,
      hasNextPage: !!getNextPageUrl(),
    };
  } catch (error) {
    console.error("Error getting page stats:", error);
    return { rowCount: 0, hasNextPage: false };
  }
}

// ─── Message Handler ───────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request.message || request.action);

  if (request.message === "scrape_data") {
    scrapeData(request.options).then(sendResponse);
    return true;
  }

  if (request.message === "get_stats") {
    sendResponse(getPageStats());
    return true;
  }

  if (request.message === "copy_data") {
    const pageData = extractAuditLogData();
    if (pageData) {
      const csv = formatAsCSV(pageData.headers, pageData.data);
      copyToClipboard(csv).then((ok) => {
        sendResponse({ success: ok, count: pageData.count });
      });
    } else {
      sendResponse({ success: false, error: "No data found" });
    }
    return true;
  }

  if (request.message === "filter_data") {
    const pageData = extractAuditLogData();
    if (pageData) {
      let filtered = Core.filterAuditLogs(
        pageData.data,
        pageData.headers,
        request.filters || {}
      );
      if (request.dateRange) {
        filtered = Core.filterAuditLogsByDateRange(
          filtered,
          pageData.headers,
          request.dateRange
        );
      }
      const csv = formatAsCSV(pageData.headers, filtered);
      sendResponse({
        success: true,
        data: filtered,
        count: filtered.length,
        csv,
      });
    } else {
      sendResponse({ success: false, error: "No data found" });
    }
    return true;
  }

  if (request.message === "start_monitoring") {
    startMonitoring();
    sendResponse({ success: true });
    return true;
  }

  if (request.message === "stop_monitoring") {
    stopMonitoring();
    sendResponse({ success: true });
    return true;
  }

  if (request.message === "update_schedule") {
    applySchedule().then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.message === "export_bundle") {
    exportEvidenceBundle(request.options || {}).then(sendResponse);
    return true;
  }

  // Called from background when scraping a tab for pagination
  if (request.message === "extract_for_pagination") {
    const pageData = extractAuditLogData();
    const nextUrl = getNextPageUrl();
    sendResponse({ data: pageData ? pageData.data : [], nextUrl });
    return true;
  }
});

// ─── Clipboard Copy ────────────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textarea);
    return result;
  }
}

// ─── Init ──────────────────────────────────────────────────────────────
console.log(`DO Audit Log Scraper v${EXT_VERSION} content script loaded`);

if (window.location.href.includes("cloud.digitalocean.com/account/security")) {
  console.log("Audit log page detected — extension ready");
  startMonitoring();
  applySchedule();
}
