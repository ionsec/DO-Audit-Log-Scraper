# DO Audit Log Scraper v2.0 - Forensic Edition

![Extension Logo](/images/logo.png)

## Overview

The DO Audit Log Scraper is a Chrome extension that fills the critical gap in DigitalOcean's ability to export audit log data using their API. **As of 2025, DigitalOcean still does not provide API access for audit log export**, making this tool essential for the DFIR (Digital Forensics and Incident Response) community.

This enhanced v2.0 release provides forensic-grade features for extracting and analyzing audit log data from the DigitalOcean control panel, with support for multiple export formats, data integrity verification, and comprehensive metadata collection.

## Why This Tool Still Matters (2025)

Despite the growing importance of security auditing and compliance, DigitalOcean continues to lack:
- API endpoints for audit log export
- Programmatic access to security history
- Built-in export functionality for audit logs

The security history remains accessible **only through the web UI**, making this Chrome extension the primary solution for:
- Forensic investigations
- Compliance reporting
- Security incident analysis
- Audit trail preservation

## New Features in v2.0

### 🔐 Forensic-Grade Enhancements
- **SHA-256 Hash Generation**: Automatic hash calculation for data integrity verification
- **Forensic Metadata**: Comprehensive metadata including timestamps, browser info, and export parameters
- **Timestamped Exports**: Automatic timestamp addition to filenames for better organization
- **Scraped-At Timestamps**: Records exact time each entry was scraped for chain of custody

### 📊 Multiple Export Formats
- **CSV Export**: Traditional comma-separated values with proper escaping
- **JSON Export**: Structured JSON with nested metadata and audit logs
- **Metadata Inclusion**: Optional forensic metadata in both formats

### 🔄 Enhanced Data Extraction
- **Pagination Support**: Automatically scrape multiple pages of audit logs
- **Error Handling**: Robust error handling for various page structures
- **Data Validation**: Ensures data integrity during extraction
- **Flexible Selectors**: Adapts to different table structures

### 🛡️ Security Improvements
- **Manifest V3 Compliance**: Updated to Chrome's latest extension security model
- **Strict Host Permissions**: Limited to `cloud.digitalocean.com` only
- **Content Security Policy**: Enhanced security policies
- **No External Dependencies**: All processing done locally for security

## Installation

1. Clone or download the repository
2. Open Google Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the repository folder
5. The extension will be installed with the new v2.0 features

## Usage

### Basic Usage

1. Navigate to [DigitalOcean Security Page](https://cloud.digitalocean.com/account/security)
2. Click the DO Audit Log Scraper extension icon
3. Choose your export options:
   - **Format**: CSV or JSON
   - **Include Metadata**: Add forensic metadata to export
   - **Generate Hash**: Create SHA-256 hash for integrity
   - **Timestamp Filename**: Add timestamp to filename
4. Click "Scrape Audit Logs" for current page or "Scrape All Pages" for complete history

### Export Options Explained

#### CSV Format
- Traditional spreadsheet-compatible format
- Includes headers: Action, User, IP Address, Time, UTC_Timestamp, Local_Timestamp, Scraped_At_UTC
- Forensic metadata added as comment line if enabled

#### JSON Format
```json
{
  "metadata": {
    "tool": "DO Audit Log Scraper",
    "version": "2.0",
    "exportedAt": "2025-01-11T12:00:00Z",
    "recordCount": 150,
    "dataHash": {
      "algorithm": "SHA-256",
      "value": "..."
    }
  },
  "auditLogs": [...]
}
```

### Forensic Best Practices

1. **Always enable hash generation** for evidence integrity
2. **Include metadata** for complete forensic documentation
3. **Use timestamped filenames** for proper evidence organization
4. **Export regularly** as DigitalOcean may limit historical data
5. **Verify hashes** after export to ensure data integrity

## Technical Details

### Data Extracted
- Action performed
- User full name
- IP address
- Time (relative)
- UTC timestamp (ISO 8601)
- Local timestamp (browser timezone)
- Scrape timestamp (for chain of custody)

### Browser Compatibility
- Google Chrome (v88+)
- Microsoft Edge (Chromium-based)
- Brave Browser
- Any Chromium-based browser supporting Manifest V3

### Limitations
- Requires manual navigation to security page
- Limited to data visible in web interface
- User identification relies on full name (potential for spoofing)
- No real-time monitoring capability

## Security Considerations

This tool is designed for legitimate forensic and compliance purposes:
- All data processing occurs locally in the browser
- No data is transmitted to external servers
- No credentials are stored or transmitted
- Extension operates only on DigitalOcean security pages

## Contributing

Contributions are welcome! Please consider:
- Testing with different DigitalOcean account types
- Reporting issues with specific audit log formats
- Suggesting additional forensic features
- Improving data extraction reliability

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [DigitalOcean](https://www.digitalocean.com/) - For providing the web-based audit logs
- DFIR Community - For feedback and feature requests
- IONSEC Team - For forensic expertise and development

## About IONSEC

IONSEC is a boutique cybersecurity services company specializing in:
- Advanced threat response
- Digital forensics and incident response (DFIR)
- Security architecture and compliance
- Tailor-made security solutions

## Contact & Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: [info@ionsec.io](mailto:info@ionsec.io)
- **Twitter**: [@ionsec_io](https://twitter.com/ionsec_io)
- **LinkedIn**: [IONSEC](https://www.linkedin.com/company/ionsec)
- **Emergency Response**: [ionsec.io/panicmode](https://ionsec.io/panicmode/)

## Changelog

### v2.0 (2025)
- Migrated to Manifest V3
- Added JSON export format
- Implemented SHA-256 hash generation
- Added forensic metadata collection
- Enhanced error handling and data validation
- Added pagination support for multiple pages
- Improved security with strict host permissions
- Updated UI with modern dark theme

### v1.0 (2024)
- Initial release
- Basic CSV export functionality
- Manifest V2 implementation

---

**Note**: This tool remains necessary due to DigitalOcean's continued lack of API support for audit log export as of 2025. We will continue to maintain and update this tool until DigitalOcean provides native API functionality.