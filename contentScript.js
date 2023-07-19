// Content script that runs on the target webpage
function scrapeData() {
  const headerRow = document.querySelector("table thead tr");
  const headerCells = Array.from(headerRow.querySelectorAll("th"));
  const headers = headerCells.map((cell) => cell.textContent.trim());

  // Add headers for "Timestamp" and "Local Timestamp"
  headers.push("Timestamp", "Local Timestamp");

  const dataRows = Array.from(document.querySelectorAll("table tbody tr"));

  // Extract the required data from each row
  const extractedData = dataRows.map((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    const rowData = cells.map((cell) => {
      const content = cell.textContent.trim();
      return content === "" ? "N/A" : content;
    });

    const dateTime = row.querySelector(".created_at time").getAttribute("datetime");
    const tooltip = row.querySelector(".created_at div").getAttribute("data-original-title");

    rowData.push(dateTime);
    rowData.push(`"${tooltip}"`); // Enclose Local Timestamp value in double quotes

    return rowData;
  });

  // Prepend headers to the extracted data
  extractedData.unshift(headers);

  // Prepare the data for CSV format
  const csvContent = "data:text/csv;charset=utf-8," + extractedData.map((row) => row.join(",")).join("\n");

  // Create a download link for the CSV file
  const downloadLink = document.createElement("a");
  downloadLink.setAttribute("href", encodeURI(csvContent));
  downloadLink.setAttribute("download", "data.csv");

  // Trigger the download
  downloadLink.click();
}

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === "scrape_data") {
    scrapeData();
    sendResponse({ message: "data_scraped" });
  }
});
