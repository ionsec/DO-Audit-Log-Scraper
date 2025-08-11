// Enhanced content script for DO Audit Log Scraper v2.0
// Includes forensic features, error handling, and multi-format export

// Generate SHA-256 hash for data integrity
async function generateSHA256(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Extract audit log data from the current page
function extractAuditLogData() {
  try {
    const table = document.querySelector("table");
    if (!table) {
      console.error("No audit log table found on page");
      return null;
    }

    // Extract headers
    const headerRow = table.querySelector("thead tr");
    if (!headerRow) {
      console.error("No header row found in table");
      return null;
    }

    const headerCells = Array.from(headerRow.querySelectorAll("th"));
    const headers = headerCells.map((cell) => cell.textContent.trim());

    // Add forensic headers
    headers.push("UTC_Timestamp", "Local_Timestamp", "Scraped_At_UTC");

    // Extract data rows
    const dataRows = Array.from(table.querySelectorAll("tbody tr"));
    
    if (dataRows.length === 0) {
      console.warn("No audit log entries found");
      return { headers, data: [], count: 0 };
    }

    const extractedData = dataRows.map((row) => {
      try {
        const cells = Array.from(row.querySelectorAll("td"));
        const rowData = cells.map((cell) => {
          // Check for nested elements like links
          const link = cell.querySelector("a");
          if (link) {
            return link.textContent.trim() || "N/A";
          }
          const content = cell.textContent.trim();
          return content === "" ? "N/A" : content;
        });

        // Extract timestamp data
        const timeElement = row.querySelector(".created_at time, time");
        const dateTime = timeElement ? timeElement.getAttribute("datetime") : "N/A";
        
        // Try to get tooltip for local time
        const tooltipElement = row.querySelector("[data-original-title], [title]");
        const localTime = tooltipElement ? 
          (tooltipElement.getAttribute("data-original-title") || tooltipElement.getAttribute("title") || "N/A") : 
          "N/A";

        // Add forensic timestamp
        const scrapedAt = new Date().toISOString();

        rowData.push(dateTime);
        rowData.push(localTime);
        rowData.push(scrapedAt);

        return rowData;
      } catch (err) {
        console.error("Error extracting row data:", err);
        return null;
      }
    }).filter(row => row !== null);

    return {
      headers,
      data: extractedData,
      count: extractedData.length
    };
  } catch (error) {
    console.error("Error in extractAuditLogData:", error);
    return null;
  }
}

// Check for pagination and get next page URL
function getNextPageUrl() {
  const nextButton = document.querySelector("a[rel='next'], .pagination a:contains('Next'), .pagination .next a");
  if (nextButton && !nextButton.classList.contains("disabled")) {
    return nextButton.href;
  }
  return null;
}

// Navigate to URL and wait for load
async function navigateToPage(url) {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (document.readyState === "complete") {
        clearInterval(checkInterval);
        setTimeout(resolve, 1000); // Wait a bit for dynamic content
      }
    }, 100);
    window.location.href = url;
  });
}

// Format data as CSV
function formatAsCSV(headers, data) {
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const csvHeaders = headers.map(escapeCSV).join(",");
  const csvRows = data.map(row => row.map(escapeCSV).join(","));
  
  return [csvHeaders, ...csvRows].join("\n");
}

// Create forensic metadata
async function createForensicMetadata(data, options) {
  const metadata = {
    tool: "DO Audit Log Scraper",
    version: "2.0",
    exportedAt: new Date().toISOString(),
    exportedBy: "IONSEC Forensic Tools",
    source: "DigitalOcean Security Audit Logs",
    sourceUrl: window.location.href,
    recordCount: data.length,
    browserInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    },
    options: options
  };

  if (options.includeHash) {
    const dataString = JSON.stringify(data);
    metadata.dataHash = {
      algorithm: "SHA-256",
      value: await generateSHA256(dataString)
    };
  }

  return metadata;
}

// Generate filename with timestamp
function generateFilename(format, includeTimestamp) {
  const timestamp = includeTimestamp ? 
    `_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}` : '';
  return `do_audit_logs${timestamp}.${format}`;
}

// Download data
async function downloadData(data, filename, format) {
  let content;
  let mimeType;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
  } else {
    content = data;
    mimeType = 'text/csv;charset=utf-8';
  }

  // Create blob and download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.click();
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Main scraping function
async function scrapeData(options = {}) {
  try {
    console.log("Starting audit log scrape with options:", options);
    
    const { format = 'csv', includeMetadata = true, includeHash = true, 
            timestampFilename = true, allPages = false } = options;
    
    let allData = [];
    let allHeaders = null;
    let pageCount = 1;
    let currentUrl = window.location.href;

    // Extract data from current page
    const pageData = extractAuditLogData();
    if (!pageData) {
      throw new Error("Failed to extract audit log data");
    }

    allHeaders = pageData.headers;
    allData = [...pageData.data];

    // Handle pagination if requested
    if (allPages) {
      let nextUrl = getNextPageUrl();
      
      while (nextUrl) {
        console.log(`Navigating to page ${++pageCount}...`);
        await navigateToPage(nextUrl);
        
        const nextPageData = extractAuditLogData();
        if (nextPageData && nextPageData.data.length > 0) {
          allData.push(...nextPageData.data);
        }
        
        nextUrl = getNextPageUrl();
      }
      
      // Navigate back to original page if we moved
      if (pageCount > 1) {
        await navigateToPage(currentUrl);
      }
    }

    console.log(`Scraped ${allData.length} total entries from ${pageCount} page(s)`);

    // Prepare export data
    let exportData;
    const filename = generateFilename(format, timestampFilename);

    if (format === 'json') {
      exportData = {
        auditLogs: allData.map(row => {
          const obj = {};
          allHeaders.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        })
      };

      if (includeMetadata) {
        const metadata = await createForensicMetadata(exportData.auditLogs, options);
        exportData.metadata = metadata;
      }
    } else {
      // CSV format
      exportData = formatAsCSV(allHeaders, allData);
      
      if (includeMetadata) {
        const metadata = await createForensicMetadata(allData, options);
        const metadataComment = `# Forensic Metadata: ${JSON.stringify(metadata).replace(/,/g, ';')}\n`;
        exportData = metadataComment + exportData;
      }
    }

    // Download the data
    await downloadData(exportData, filename, format);

    return {
      success: true,
      count: allData.length,
      pages: pageCount
    };

  } catch (error) {
    console.error("Scraping error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get statistics about the current page
function getPageStats() {
  try {
    const dataRows = document.querySelectorAll("table tbody tr");
    return {
      rowCount: dataRows.length,
      hasNextPage: !!getNextPageUrl()
    };
  } catch (error) {
    console.error("Error getting page stats:", error);
    return {
      rowCount: 0,
      hasNextPage: false
    };
  }
}

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request.message);
  
  if (request.message === "scrape_data") {
    scrapeData(request.options).then(result => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }
  
  if (request.message === "get_stats") {
    const stats = getPageStats();
    sendResponse(stats);
    return true;
  }
  
  // Legacy support for old message format
  if (request.message === "scrape_data_legacy") {
    scrapeData({ format: 'csv' }).then(result => {
      sendResponse({ message: result.success ? "data_scraped" : "error" });
    });
    return true;
  }
});

// Initialize - log that content script is loaded
console.log("DO Audit Log Scraper v2.0 content script loaded");

// Periodically check if we're on the right page and report status
if (window.location.href.includes("cloud.digitalocean.com/account/security")) {
  console.log("Audit log page detected - extension ready");
}