// Background service worker for Manifest V3
chrome.runtime.onInstalled.addListener(() => {
  console.log('DO Audit Log Scraper installed');
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadData') {
    // Handle download request
    const { data, filename, format } = request;
    
    let blob;
    let mimeType;
    
    if (format === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      mimeType = 'application/json';
    } else {
      // CSV format
      blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
      mimeType = 'text/csv';
    }
    
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, (downloadId) => {
      // Clean up the object URL after download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      sendResponse({ success: true, downloadId });
    });
    
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'getTabInfo') {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Will respond asynchronously
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Check if we're on DigitalOcean security page
  if (tab.url && tab.url.includes('cloud.digitalocean.com/account/security')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // This will be executed in the context of the page
        console.log('DO Audit Log Scraper activated');
      }
    });
  }
});