// Background service worker for DO Audit Log Scraper v2.1 — Manifest V3

const DO_ORIGIN = "https://cloud.digitalocean.com";

chrome.runtime.onInstalled.addListener(() => {
  console.log("DO Audit Log Scraper v2.1 installed");
});

// ─── Message Handler ────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Download via chrome.downloads API (service-worker-safe)
  if (request.action === "downloadData") {
    const { content, filename, mimeType } = request;

    const blob = new Blob([content], { type: mimeType || "text/plain" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download(
      { url, filename, saveAs: true },
      (downloadId) => {
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        sendResponse({ success: true, downloadId });
      }
    );
    return true;
  }

  // Pagination helper: open a temp tab, inject content script, extract data
  if (request.action === "scrapePageInTab") {
    const { url } = request;
    scrapePageInNewTab(url)
      .then(sendResponse)
      .catch((err) => sendResponse({ data: [], nextUrl: null, error: err.message }));
    return true;
  }

  // Forward new-entry notifications from content script to popup
  if (request.action === "newEntriesDetected") {
    // Show a Chrome notification
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "New Audit Log Entries",
      message: `${request.count} new entry detected at ${request.timestamp}`,
    });
    // Also forward to popup if open
    chrome.runtime.sendMessage({
      action: "newEntriesNotification",
      count: request.count,
      timestamp: request.timestamp,
    }).catch(() => {
      // Popup may not be open — ignore
    });
    sendResponse({ received: true });
    return true;
  }

  // Keyboard shortcut: scrape current page
  if (request.action === "shortcutScrape") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          message: "scrape_data",
          options: { allPages: false },
        }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true;
  }
});

// ─── Keyboard Shortcut Handler ──────────────────────────────────────────
chrome.commands?.onCommand?.addListener((command) => {
  if (command === "scrape-current-page") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          message: "scrape_data",
          options: { allPages: false },
        });
      }
    });
  }
});

// ─── Tab-based pagination scraping ─────────────────────────────────────
// Opens a URL in a new tab, injects the content script, extracts data,
// and closes the tab. Returns extracted data + next URL for chaining.
async function scrapePageInNewTab(url) {
  // Validate URL origin
  try {
    const parsed = new URL(url);
    if (parsed.origin !== DO_ORIGIN) {
      throw new Error(`Refusing to navigate to origin: ${parsed.origin}`);
    }
  } catch (err) {
    return { data: [], nextUrl: null, error: err.message };
  }

  let tab;
  try {
    tab = await chrome.tabs.create({ url, active: false });

    // Wait for tab to finish loading
    await new Promise((resolve) => {
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          // Extra delay for dynamic content rendering
          setTimeout(resolve, 1500);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Inject content script into the new tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["contentScript.js"],
    });

    // Give the script a moment to initialise
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Ask it to extract data
    const response = await chrome.tabs.sendMessage(tab.id, {
      message: "extract_for_pagination",
    });

    return {
      data: response?.data || [],
      nextUrl: response?.nextUrl || null,
    };
  } catch (err) {
    console.error("Error scraping page in tab:", err);
    return { data: [], nextUrl: null, error: err.message };
  } finally {
    if (tab) {
      chrome.tabs.remove(tab.id).catch(() => {});
    }
  }
}
