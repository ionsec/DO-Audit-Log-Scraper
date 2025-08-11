// Popup script for Manifest V3
document.addEventListener("DOMContentLoaded", async function () {
  const scrapeButton = document.getElementById("scrapeButton");
  const scrapeAllButton = document.getElementById("scrapeAllButton");
  const messageDiv = document.getElementById("message");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const statsDiv = document.getElementById("stats");

  // Check if we're on the correct page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url && tab.url.includes("cloud.digitalocean.com/account/security")) {
    statusDot.classList.add("active");
    statusText.textContent = "Ready to scrape";
    scrapeButton.disabled = false;
    scrapeAllButton.disabled = false;
    
    // Try to get page stats
    try {
      const [result] = await chrome.tabs.sendMessage(tab.id, { 
        message: "get_stats" 
      }).catch(err => {
        console.log("Content script not ready yet");
        return [null];
      });
      
      if (result && result.rowCount !== undefined) {
        statsDiv.textContent = `Found ${result.rowCount} audit log entries on current page`;
      }
    } catch (err) {
      console.log("Could not get stats:", err);
    }
  } else {
    statusDot.classList.add("inactive");
    statusText.textContent = "Please navigate to DigitalOcean Security page";
    showWarning("Please open the DigitalOcean Security page first");
  }

  // Scrape current page
  scrapeButton.addEventListener("click", async function () {
    const format = document.querySelector('input[name="format"]:checked').value;
    const includeMetadata = document.getElementById("includeMetadata").checked;
    const includeHash = document.getElementById("includeHash").checked;
    const timestampFilename = document.getElementById("timestampFilename").checked;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, { 
        message: "scrape_data",
        options: {
          format,
          includeMetadata,
          includeHash,
          timestampFilename,
          allPages: false
        }
      });

      if (response && response.success) {
        showSuccess(`Successfully scraped ${response.count} audit log entries!`);
      } else {
        showError("Failed to scrape data. Please check the console for details.");
      }
    } catch (error) {
      console.error("Error:", error);
      showError("Error: " + error.message);
    }
  });

  // Scrape all pages (with pagination)
  scrapeAllButton.addEventListener("click", async function () {
    const format = document.querySelector('input[name="format"]:checked').value;
    const includeMetadata = document.getElementById("includeMetadata").checked;
    const includeHash = document.getElementById("includeHash").checked;
    const timestampFilename = document.getElementById("timestampFilename").checked;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      showInfo("Scraping all pages... This may take a moment.");
      
      const response = await chrome.tabs.sendMessage(tab.id, { 
        message: "scrape_data",
        options: {
          format,
          includeMetadata,
          includeHash,
          timestampFilename,
          allPages: true
        }
      });

      if (response && response.success) {
        showSuccess(`Successfully scraped ${response.count} total entries from ${response.pages} page(s)!`);
      } else {
        showError("Failed to scrape all pages. Please check the console for details.");
      }
    } catch (error) {
      console.error("Error:", error);
      showError("Error: " + error.message);
    }
  });

  // Show success message
  function showSuccess(message) {
    messageDiv.textContent = message;
    messageDiv.style.display = "block";
    messageDiv.id = "success";
    setTimeout(() => {
      messageDiv.style.display = "none";
    }, 5000);
  }

  // Show error message
  function showError(message) {
    messageDiv.textContent = message;
    messageDiv.style.display = "block";
    messageDiv.id = "error";
  }

  // Show warning message
  function showWarning(message) {
    messageDiv.textContent = message;
    messageDiv.style.display = "block";
    messageDiv.id = "warning";
  }

  // Show info message
  function showInfo(message) {
    messageDiv.textContent = message;
    messageDiv.style.display = "block";
    messageDiv.id = "success";
  }
});