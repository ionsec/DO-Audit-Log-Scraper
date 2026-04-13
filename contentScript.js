// DO Audit Log Scraper v2.1 — Forensic Edition
// Rewritten: bug fixes, CSV injection protection, pagination via messaging,
// MutationObserver monitoring, search/filter, clipboard, storage persistence

const EXT_VERSION = "2.1";
const DO_SECURITY_ORIGIN = "https://cloud.digitalocean.com";

// ─── SHA-256 Hash ────────────────────────────────────────────────────────
async function generateSHA256(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── CSV Sanitisation (formula-injection protection) ────────────────────
function sanitiseCSVCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Prevent CSV formula injection: prefix dangerous chars with a tab
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
          const dateTime = timeElement
            ? timeElement.getAttribute("datetime")
            : "N/A";

          const tooltipElement = row.querySelector(
            "[data-original-title], [title]"
          );
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

// ─── Pagination (fixed: uses chrome messaging instead of page navigation) ─
function getNextPageUrl() {
  // Fixed: removed invalid jQuery :contains() pseudo-selector
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
        // Validate URL is on the same origin
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
      // Selector may not match anything — continue
    }
  }

  // Fallback: look for text-based "Next" links
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
  const csvHeaders = headers.map(escapeCSV).join(",");
  const csvRows = data.map((row) => row.map(escapeCSV).join(","));
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
    },
  };

  if (options.includeHash) {
    const dataString = JSON.stringify(data);
    metadata.dataHash = {
      algorithm: "SHA-256",
      value: await generateSHA256(dataString),
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

// ─── Download ───────────────────────────────────────────────────────────
async function downloadData(data, filename, format) {
  let content;
  let mimeType;

  if (format === "json") {
    content = JSON.stringify(data, null, 2);
    mimeType = "application/json";
  } else {
    content = data;
    mimeType = "text/csv;charset=utf-8";
  }

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

// ─── Pagination via background messaging (replaces broken navigateToPage) ─
// Instead of navigating the content script page (which destroys the context),
// we ask the background worker to create a new temporary tab, inject the
// content script there, scrape, and return data.

async function scrapeAllPages(options, firstPageData) {
  let nextUrl = getNextPageUrl();
  if (!nextUrl) {
    return { data: firstPageData.data, headers: firstPageData.headers, pages: 1 };
  }

  let allData = [...firstPageData.data];
  const headers = firstPageData.headers;
  let pages = 1;
  let currentUrl = nextUrl;

  while (currentUrl) {
    pages++;
    // Ask background to open the URL in a hidden tab, inject script, and return data
    const result = await chrome.runtime.sendMessage({
      action: "scrapePageInTab",
      url: currentUrl,
    });

    if (result && result.data && result.data.length > 0) {
      allData.push(...result.data);
    }

    // Get next URL from the scraped page (background returns it)
    currentUrl = result ? result.nextUrl : null;
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
      includeHash = true,
      timestampFilename = true,
      allPages = false,
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

    console.log(
      `Scraped ${allData.length} total entries from ${pageCount} page(s)`
    );

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
        // Standard CSV comment — metadata on separate lines, no embedded JSON
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

    // Add BOM for proper UTF-8 handling in Excel
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

// ─── Search / Filter ───────────────────────────────────────────────────
function filterAuditLogs(data, headers, filters) {
  if (!filters || Object.keys(filters).length === 0) return data;

  return data.filter((row) => {
    return Object.entries(filters).every(([key, value]) => {
      const colIndex = headers.indexOf(key);
      if (colIndex === -1) return true;
      if (!value) return true;
      const cellValue = String(row[colIndex]).toLowerCase();
      return cellValue.includes(String(value).toLowerCase());
    });
  });
}

// ─── Clipboard Copy ────────────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
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

// ─── MutationObserver — real-time monitoring ────────────────────────────
let observer = null;
let lastRowCount = 0;

function startMonitoring() {
  const table = document.querySelector("table tbody");
  if (!table) return;

  lastRowCount = table.querySelectorAll("tr").length;

  observer = new MutationObserver((mutations) => {
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
      const filtered = filterAuditLogs(
        pageData.data,
        pageData.headers,
        request.filters
      );
      const csv = formatAsCSV(pageData.headers, filtered);
      sendResponse({ success: true, data: filtered, count: filtered.length, csv });
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

  // Called from background when scraping a tab for pagination
  if (request.message === "extract_for_pagination") {
    const pageData = extractAuditLogData();
    const nextUrl = getNextPageUrl();
    sendResponse({ data: pageData ? pageData.data : [], nextUrl });
    return true;
  }
});

// ─── Init ──────────────────────────────────────────────────────────────
console.log(`DO Audit Log Scraper v${EXT_VERSION} content script loaded`);

if (window.location.href.includes("cloud.digitalocean.com/account/security")) {
  console.log("Audit log page detected — extension ready");
  // Auto-start monitoring
  startMonitoring();
}
CONTENT