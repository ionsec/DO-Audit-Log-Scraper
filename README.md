# DO Audit Log Scraper v2.1 — Forensic Edition

![Extension Logo](/images/logo.png)

## Overview

The DO Audit Log Scraper is a Chrome extension that fills the critical gap in DigitalOcean's ability to export audit log data using their API. **As of 2025, DigitalOcean still does not provide API access for audit log export**, making this tool essential for the DFIR (Digital Forensics and Incident Response) community.

v2.1 is a significant hardening release: critical bugs fixed, security vulnerabilities patched, new forensic features added, and full Sphinx/ReadTheDocs documentation shipped.

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

## What's New in v2.1

### 🐛 Critical Bug Fixes
- **Pagination rewritten** — The previous `navigateToPage()` function destroyed the content script context by navigating the page. Pagination now works via background-mediated tab scraping: opens a hidden tab, extracts data, closes it, and chains to the next page.
- **Invalid CSS selector fixed** — `getNextPageUrl()` used jQuery-only `:contains('Next')` syntax. Replaced with standard CSS selectors + text-match fallback.
- **Message handling fixed** — `sendMessage` response destructuring in `popup.js` always returned `undefined`. Fixed.
- **Message display fixed** — `showInfo()` reused the success style; `messageDiv.id` mutation broke subsequent lookups. Messages now use CSS classes.
- **Service worker compatibility** — Removed `URL.createObjectURL` from Manifest V3 service worker (not available). Downloads now handled via content-script Blob.
- **Dead code removed** — Unused `action.onClicked`, `getTabInfo`, and `scrape_data_legacy` handlers.

### 🛡️ Security Hardening
- **CSV injection protection** — Cells starting with `=`, `+`, `-`, `@` are tab-prefixed to neutralize formula injection in spreadsheet applications.
- **External CDN removed** — Font Awesome from `cdnjs.cloudflare.com` replaced with inline SVG icons. No supply-chain risk, no CSP violation.
- **Pagination URL validation** — All navigation URLs validated against `cloud.digitalocean.com` origin before use.
- **UTF-8 BOM** — CSV exports include a BOM for correct Excel rendering.
- **`rel="noopener noreferrer"`** — Added to all external links in popup.

### ✨ New Features
- **Real-time monitoring** — MutationObserver watches the audit table for new entries and fires native Chrome notifications.
- **Search & filter** — Filter by User, Action, or IP address before exporting.
- **Copy to clipboard** — Quick-copy CSV data to clipboard with a single click.
- **Export filtered** — Download only matching entries as a filtered CSV.
- **Keyboard shortcut** — `Ctrl+Shift+S` / `Cmd+Shift+S` to scrape the current page instantly.
- **Persistent preferences** — Export options saved across sessions via `chrome.storage.local`.
- **Chrome notifications** — Real-time alerts when new audit log entries are detected.

### 📚 Full Documentation
- 10-page Sphinx documentation with ReadTheDocs theme
- Covers: getting started, usage, architecture, forensics, configuration, security, API reference, contributing, changelog
- Auto-deploy via `.readthedocs.yaml`

### 🛠️ Modern Tooling
- `package.json` with lint, format, and docs scripts
- ESLint with `standard` config + webextensions globals
- Prettier config
- `.gitignore`

## Features

### 🔐 Forensic-Grade Enhancements
- **SHA-256 Hash Generation**: Automatic hash calculation for data integrity verification
- **Forensic Metadata**: Comprehensive metadata including timestamps, browser info, and export parameters
- **Timestamped Exports**: Automatic timestamp addition to filenames for better organization
- **Scraped-At Timestamps**: Records exact time each entry was scraped for chain of custody

### 📊 Multiple Export Formats
- **CSV Export**: RFC 4180-compliant with formula-injection protection and UTF-8 BOM
- **JSON Export**: Structured JSON with nested metadata and audit logs
- **Metadata Inclusion**: Optional forensic metadata in both formats

### 🔍 Search & Filter
- Filter audit logs by **User**, **Action**, or **IP Address** before exporting
- Export only matching entries with the "Export Filtered" button

### 🔄 Enhanced Data Extraction
- **Pagination Support**: Background-mediated multi-page scraping that preserves content script context
- **Real-time Monitoring**: MutationObserver detects new entries and sends Chrome notifications
- **Error Handling**: Robust error handling for various page structures
- **Data Validation**: Ensures data integrity during extraction

### 🛡️ Security
- **Manifest V3 Compliance**: Chrome's latest extension security model
- **Strict Host Permissions**: Limited to `cloud.digitalocean.com` only
- **Content Security Policy**: `script-src 'self'; object-src 'none'`
- **No External Dependencies**: All processing done locally — no CDN, no network calls
- **CSV Injection Protection**: Tab-prefix for dangerous cell values
- **URL Validation**: Pagination URLs validated against known origin

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ionsec/DO-Audit-Log-Scraper.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the repository folder
5. The extension icon will appear in your toolbar

## Usage

### Basic Usage

1. Navigate to the [DigitalOcean Security Page](https://cloud.digitalocean.com/account/security)
2. Click the DO Audit Log Scraper extension icon
3. Configure your export options (format, metadata, hash, etc.)
4. Click **Scrape Audit Logs** (current page) or **Scrape All Pages** (complete history)

### Keyboard Shortcut

Press `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`) to scrape the current page instantly — no need to open the popup.

### Search & Filter

Use the filter fields (User, Action, IP) to narrow down results before exporting. Click **Export Filtered** to download only matching entries.

### Real-time Monitoring

Toggle the **"Alert on new entries"** switch in the popup. The extension will watch the audit table and send a Chrome notification whenever new entries appear.

### Export Options

| Option | Default | Description |
|--------|---------|-------------|
| Format | CSV | CSV or JSON export |
| Include forensic metadata | On | Embed tool version, timestamps, browser info |
| Generate SHA-256 hash | On | Integrity hash of exported data |
| Add timestamp to filename | On | ISO 8601 timestamp in filename |

All preferences are saved automatically and persist across browser sessions.

### CSV Format
- Spreadsheet-compatible with proper RFC 4180 escaping
- UTF-8 BOM for correct Excel rendering
- Formula-injection protection (dangerous cells tab-prefixed)
- Headers: Action, User, IP Address, Time, UTC_Timestamp, Local_Timestamp, Scraped_At_UTC
- Forensic metadata as comment lines if enabled

### JSON Format
```json
{
  "metadata": {
    "tool": "DO Audit Log Scraper",
    "version": "2.1",
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
4. **Export in both CSV and JSON** — CSV for spreadsheets, JSON for programmatic use
5. **Verify hashes** after export to ensure data integrity
6. **Enable real-time monitoring** during active investigations

### Verifying Data Integrity

```bash
# Verify SHA-256 hash from JSON metadata
python3 -c "
import json, sys, hashlib
data = json.load(open('do_audit_logs.json'))
claimed = data['metadata']['dataHash']['value']
actual = hashlib.sha256(json.dumps(data['auditLogs']).encode()).hexdigest()
print(f'Claimed: {claimed}')
print(f'Actual:  {actual}')
print(f'Match:   {claimed == actual}')
"
```

## Technical Details

### Data Extracted
- Action performed
- User full name
- IP address
- Time (relative)
- UTC timestamp (ISO 8601)
- Local timestamp (browser timezone)
- Scrape timestamp (for chain of custody)

### Architecture

| Component | Role |
|-----------|------|
| `popup.html/js` | User interface |
| `contentScript.js` | Page interaction, data extraction, monitoring |
| `background.js` | Service worker: downloads, pagination, notifications |

### Browser Compatibility
- Google Chrome (v88+)
- Microsoft Edge (Chromium-based)
- Brave Browser
- Any Chromium-based browser supporting Manifest V3

### Limitations
- Requires manual navigation to security page
- Limited to data visible in web interface
- User identification relies on full name (potential for spoofing)
- Pagination depends on DigitalOcean's DOM structure

## Security Considerations

This tool is designed for legitimate forensic and compliance purposes:
- All data processing occurs locally in the browser
- No data is transmitted to external servers
- No credentials are stored or transmitted
- Extension operates only on DigitalOcean security pages
- No external CDN dependencies
- CSV exports are sanitized against formula injection

## Development

```bash
# Install dev dependencies
npm install

# Lint
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code
npm run format

# Build documentation
npm run docs
```

## Documentation

Full documentation is available at [ReadTheDocs](https://do-audit-log-scraper.readthedocs.io/) or build locally:

```bash
pip install sphinx sphinx-rtd-theme
cd docs && sphinx-build -b html source _build/html
open _build/html/index.html
```

## Contributing

Contributions are welcome! Please consider:
- Testing with different DigitalOcean account types
- Reporting issues with specific audit log formats
- Suggesting additional forensic features
- Improving data extraction reliability

See [CONTRIBUTING](docs/source/contributing.rst) for detailed guidelines.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [DigitalOcean](https://www.digitalocean.com/) — For providing the web-based audit logs
- DFIR Community — For feedback and feature requests
- IONSEC Team — For forensic expertise and development

## About IONSEC

IONSEC is a boutique cybersecurity services company specializing in:
- Advanced threat response
- Digital forensics and incident response (DFIR)
- Security architecture and compliance
- Tailor-made security solutions

## Contact & Support

- **Issues**: [GitHub Issues](https://github.com/ionsec/DO-Audit-Log-Scraper/issues)
- **Email**: [info@ionsec.io](mailto:info@ionsec.io)
- **Twitter**: [@ionsec_io](https://twitter.com/ionsec_io)
- **LinkedIn**: [IONSEC](https://www.linkedin.com/company/ionsec)
- **Emergency Response**: [ionsec.io/panicmode](https://ionsec.io/panicmode/)

## Changelog

### v2.1 (2025)
**Bug Fixes:**
- Fixed broken pagination (replaced with background-mediated tab scraping)
- Fixed invalid `:contains()` CSS selector in `getNextPageUrl()`
- Fixed `sendMessage` response destructuring in popup.js
- Fixed message display (CSS classes instead of ID mutation)
- Fixed `URL.createObjectURL` in Manifest V3 service worker
- Removed dead code (`action.onClicked`, `getTabInfo`, `scrape_data_legacy`)
- Changed `run_at` to `document_idle`

**Security:**
- Added CSV formula-injection protection
- Removed external Font Awesome CDN (replaced with inline SVGs)
- Added origin validation for pagination URLs
- Added UTF-8 BOM to CSV exports
- Added `rel="noopener noreferrer"` to external links

**New Features:**
- Real-time monitoring with MutationObserver + Chrome notifications
- Search/filter panel (User, Action, IP)
- Copy to clipboard button
- Export filtered entries
- Keyboard shortcut (`Ctrl+Shift+S` / `Cmd+Shift+S`)
- Persistent export preferences via `chrome.storage.local`

**Tooling & Docs:**
- `package.json`, ESLint, Prettier, `.gitignore`
- Full Sphinx/ReadTheDocs documentation (10 RST pages)

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
