# DO Audit Log Scraper

![Extension Logo](/images/logo.png)

## Overview

The DO Audit Log Scraper is a Chrome extension that fills the gap in DigitalOcean's ability to export audit log data using their API. This tool was built to address the needs of the DFIR (Digital Forensics and Incident Response) community by providing an easy and efficient way to extract and analyze audit log data from the DigitalOcean control panel.

The extension allows you to scrape the audit logs and export the data in CSV format, making it convenient for forensic investigation purposes. The exported CSV file includes forensically accurate timestamps, enabling detailed analysis and investigation of security incidents or compliance-related activities.

## Features

- **Scrape Audit Logs**: Click the "Scrape Data" button in the extension popup to initiate the scraping process. The extension will extract the required data from the audit logs on the DigitalOcean control panel.

- **Export as CSV**: The scraped data will be exported in CSV format, with forensically accurate timestamps, ensuring compatibility with forensic analysis tools and workflows.

- **Simple and Intuitive Interface**: The extension provides a user-friendly interface, allowing you to scrape and export audit log data with just a few clicks.

## Installation

Follow these steps to install the DO Audit Log Scraper extension:

1. Clone or download the repository.

2. Open Google Chrome and go to `chrome://extensions/`.

3. Enable the "Developer mode" option at the top right corner.

4. Click on "Load unpacked" and select the cloned/downloaded repository folder.

5. The extension will be installed and ready to use.

## Usage

1. Open the [DigitalOcean control panel](https://cloud.digitalocean.com/account/security) in Google Chrome.

2. Click on the DO Audit Log Scraper extension icon next to the address bar to open the extension popup.

3. Click the "Scrape Data" button to initiate the scraping process.

4. The extension will extract the audit log data and automatically download it as a CSV file with forensically accurate timestamps.

## Compatibility

The DO Audit Log Scraper extension is compatible with Google Chrome and other Chromium-based browsers.

## Migration to Manifest V3

Please note that the current version of the DO Audit Log Scraper extension is built using the Manifest V2 format due to its simplicity. However, we are actively working on migrating the extension to the more comprehensive Manifest V3. Stay tuned for updates and the enhanced version of the extension.

## Contributing

Contributions are welcome! If you encounter any issues or have suggestions for improvement, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [DigitalOcean](https://www.digitalocean.com/) - For providing the audit log data on their control panel.

## About Us
IONSEC is a boutique cybersecurity services company that deals with advanced threat actors and provides tailor-made security solutions for organizations worldwide
## Contact

If you have any questions or inquiries, please feel free to reach out to us at [info@ionsec.io](mailto:info@ionsec.io).
