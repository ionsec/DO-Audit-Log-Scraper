// Popup script that communicates with the content script
document.addEventListener("DOMContentLoaded", function () {
  const scrapeButton = document.getElementById("scrapeButton");
  const messageDiv = document.getElementById("message");

  // Send a message to the content script to initiate data scraping
  scrapeButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { message: "scrape_data" }, function (response) {
        if (chrome.runtime.lastError) {
          showError("Error: " + chrome.runtime.lastError.message);
        } else if (response && response.message && response.message === "data_scraped") {
          showSuccess("Data scraped successfully!");
        } else {
          showError("Error: Failed to scrape data or missing response message");
        }
      });
    });
  });

  // Function to show a success message
  function showSuccess(message) {
    messageDiv.innerText = message;
    messageDiv.style.display = "block";
    messageDiv.style.backgroundColor = "#28a745";
  }

  // Function to show an error message
  function showError(message) {
    messageDiv.innerText = message;
    messageDiv.style.display = "block";
    messageDiv.style.backgroundColor = "#dc3545";
  }
});
