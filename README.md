<div align="center">

# 🔍 DO Audit Log Scraper

**v2.2 — Forensic Edition** · The DFIR tool DigitalOcean won't give you

![Extension Logo](/images/logo.png)

[![Version](https://img.shields.io/badge/version-2.2-blue)](#changelog)
[![Manifest](https://img.shields.io/badge/manifest-v3-9cf)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)
[![Tests](https://img.shields.io/badge/tests-52%20passing-success)](#testing)
[![Platform](https://img.shields.io/badge/platform-Chromium-important)](#browser-compatibility)

_Dependency-free · No external CDN · Origin-locked to `cloud.digitalocean.com` · Manifest V3_

</div>

---

## Table of Contents

- [Why This Tool Matters](#why-this-tool-matters)
- [What's New in v2.2](#whats-new-in-v22)
- [Features](#features)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Technical Details](#technical-details)
- [Security Considerations](#security-considerations)
- [Testing](#testing)
- [Development](#development)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

---

## Why This Tool Matters

The DO Audit Log Scraper is a Chrome extension that fills the critical gap in
DigitalOcean's ability to export audit log data using their API. **As of 2026,
DigitalOcean still does not provide API access for audit log export**, making
this tool essential for the DFIR (Digital Forensics and Incident Response)
community.

Despite the growing importance of security auditing and compliance, DigitalOcean
continues to lack:

- ❌ API endpoints for audit log export
- ❌ Programmatic access to security history
- ❌ Built-in export functionality for audit logs

The security history remains accessible **only through the web UI**, making this
Chrome extension the primary solution for:

| Use Case                      | Why It Helps                                                       |
| ----------------------------- | ------------------------------------------------------------------ |
| 🔎 Forensic investigations    | Preserve exact, timestamped evidence with SHA-256 integrity hashes |
| 🧾 Compliance reporting       | Export clean, well-formed CSV/JSON for auditors                    |
| 🚨 Security incident analysis | Filter by user, action, IP, and time window                        |
| 💾 Audit trail preservation   | Archive complete history as a self-contained evidence bundle       |

---

## What's New in v2.2

### 🆕 Forensic Features

- **🗓️ Date-range filter + export** — Filter audit logs by a UTC timestamp
  window (on top of the existing text filters), then export the combined result.
- **♻️ Cross-page deduplication** — Boundary rows that repeat across pagination
  turns are collapsed. The default key uses the source columns _before_ the
  appended timestamps, so the per-scrape `Scraped_At_UTC` never collapses
  genuinely distinct rows. Toggleable.
- **⏰ Automated scheduling** — Schedule periodic scrapes (1 minute – 7 days)
  persisted in `chrome.storage.local`, with a re-entrancy guard so runs never
  overlap.
- **📦 Evidence bundle** — One click downloads a dependency-free ZIP (`STORE` +
  CRC-32) containing `audit_logs.csv`, `audit_logs.json`, `metadata.json`,
  `SHA256SUMS.txt`, and `README.txt`.

### 🛡️ Hardening

- **🚧 Pagination page-cap** — `MAX_SCRAPE_PAGES` (100) plus origin validation
  on every next-page URL prevent runaway/infinite scrape loops.
- **🔐 ZIP path-traversal protection** — `sanitiseZipEntryName` strips `..`,
  absolute paths, and control characters from bundle entry names.
- **🛡️ CSV injection protection** retained for all exports (scrape, filter,
  bundle).

### 🧪 Testing

- **Jest** unit tests for all pure logic in `lib/core.js` (CSV, SHA-256,
  filters, dedup, page-cap, schedule clamp, CRC-32, ZIP).
- **Playwright** end-to-end tests against a mock DigitalOcean security page
  (single-page scrape, page-cap on a self-loop, dedup, filters, evidence-bundle
  download).
- Run with `npm test`, `npm run test:e2e`, or `npm run test:all`.

---

## Features

### 🔐 Forensic-Grade Enhancements

- **SHA-256 Hash Generation** — Automatic hash calculation for data integrity verification
- **Forensic Metadata** — Comprehensive metadata including timestamps, browser info, and export parameters
- **Timestamped Exports** — Automatic timestamp addition to filenames for better organization
- **Scraped-At Timestamps** — Records the exact time each entry was scraped for chain of custody
- **Evidence Bundle** — Dependency-free ZIP with CSV, JSON, metadata, SHA-256 manifest, and README _(v2.2)_
- **Automated Scheduling** — Configurable recurring scrapes with overlap protection _(v2.2)_

### 📊 Multiple Export Formats

- **CSV Export** — RFC 4180-compliant with formula-injection protection and UTF-8 BOM
- **JSON Export** — Structured JSON with nested metadata and audit logs
- **Metadata Inclusion** — Optional forensic metadata in both formats

### 🔍 Search, Filter & Deduplicate

- Filter audit logs by **User**, **Action**, or **IP Address** before exporting
- **Date-range filter** on the UTC timestamp column _(v2.2)_
- **Cross-page deduplication** to collapse boundary rows repeated across pages _(v2.2)_
- Export only matching entries with the **Export Filtered** button

### 🔄 Enhanced Data Extraction

- **Pagination Support** — Background-mediated multi-page scraping that preserves content script context
- **Real-time Monitoring** — MutationObserver detects new entries and sends Chrome notifications
- **Error Handling** — Robust error handling for various page structures
- **Data Validation** — Ensures data integrity during extraction

### 🛡️ Security

- **Manifest V3 Compliance** — Chrome's latest extension security model
- **Strict Host Permissions** — Limited to `cloud.digitalocean.com` only
- **Content Security Policy** — `script-src 'self'; object-src 'none'`
- **No External Dependencies** — All processing done locally — no CDN, no network calls
- **CSV Injection Protection** — Tab-prefix for dangerous cell values
- **URL Validation** — Pagination URLs validated against known origin + hard page cap _(v2.2)_

---

## Quick Start

```bash
# 1. Get the code
git clone https://github.com/ionsec/DO-Audit-Log-Scraper.git
cd DO-Audit-Log-Scraper

# 2. (Optional) install dev tooling for linting/tests
npm install

# 3. Load in Chrome
#    chrome://extensions → Developer mode → Load unpacked → select this folder
```

Open [the DigitalOcean Security page](https://cloud.digitalocean.com/account/security),
click the extension icon, and hit **Scrape Audit Logs**. 🚀

---

## Usage

### Basic Usage

1. Navigate to the [DigitalOcean Security Page](https://cloud.digitalocean.com/account/security)
2. Click the DO Audit Log Scraper extension icon
3. Configure your export options (format, metadata, hash, dedup, date range, schedule, etc.)
4. Click **Scrape Audit Logs** (current page) or **Scrape All Pages** (complete history)

### Keyboard Shortcut

Press `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`) to scrape the current page instantly — no need to open the popup.

### Date-Range Filter

Use the **From / To** datetime fields in the popup to confine a scrape or export
to a UTC timestamp window. Combine with the User/Action/IP text filters for
precise targeting. _(v2.2)_

### Cross-Page Deduplication

Leave **Deduplicate** on to collapse boundary rows that repeat across pagination
turns. Disable it if you want the raw, per-page data. _(v2.2)_

### Automated Scheduling

Toggle the **Schedule** switch, set an interval (1 minute – 7 days), and the
extension will scrape on that cadence while the page is open. Runs never overlap. _(v2.2)_

### Evidence Bundle

Click **Export Evidence Bundle** to download a single self-contained ZIP with
the CSV, JSON, metadata, SHA-256 manifest, and a README — everything a forensic
investigator needs in one file. _(v2.2)_

### Real-Time Monitoring

Toggle the **"Alert on new entries"** switch in the popup. The extension will
watch the audit table and send a Chrome notification whenever new entries appear.

### Export Options

| Option                    | Default | Description                                           |
| ------------------------- | ------- | ----------------------------------------------------- |
| Format                    | CSV     | CSV or JSON export                                    |
| Include forensic metadata | On      | Embed tool version, timestamps, browser info          |
| Generate SHA-256 hash     | On      | Integrity hash of exported data                       |
| Add timestamp to filename | On      | ISO 8601 timestamp in filename                        |
| Cross-page deduplication  | On      | Collapse boundary rows repeated across pages _(v2.2)_ |

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
    "version": "2.2",
    "exportedAt": "2026-08-07T12:00:00Z",
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
7. **Download an evidence bundle** for a complete, single-file case package _(v2.2)_

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

---

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

| Component          | Role                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| `lib/core.js`      | Pure, DOM/chrome-free logic — shared by the content script and Jest _(v2.2)_ |
| `popup.html/js`    | User interface                                                               |
| `contentScript.js` | Page interaction, data extraction, filtering, scheduling, bundling           |
| `background.js`    | Service worker: downloads, pagination, notifications                         |

### Browser Compatibility

- Google Chrome (v88+)
- Microsoft Edge (Chromium-based)
- Brave Browser
- Any Chromium-based browser supporting Manifest V3

### Limitations

- Requires manual navigation to the security page
- Limited to data visible in the web interface
- User identification relies on full name (potential for spoofing)
- Pagination depends on DigitalOcean's DOM structure

---

## Security Considerations

This tool is designed for legitimate forensic and compliance purposes:

- ✅ All data processing occurs locally in the browser
- ✅ No data is transmitted to external servers
- ✅ No credentials are stored or transmitted
- ✅ Extension operates only on DigitalOcean security pages
- ✅ No external CDN dependencies
- ✅ CSV exports are sanitized against formula injection
- ✅ Pagination URLs are origin-validated and page-capped _(v2.2)_
- ✅ Evidence-bundle ZIP entry names are sanitized against path traversal _(v2.2)_

---

## Testing

A full test suite ships with the project — no build step required. Pure logic is
exercised directly, and the content script runs end-to-end against a mock
DigitalOcean page in a real browser.

| Suite       | Runner       | Scope                                                                               |
| ----------- | ------------ | ----------------------------------------------------------------------------------- |
| Unit        | Jest + jsdom | `lib/core.js` — CSV, SHA-256, filters, dedup, page-cap, schedule clamp, CRC-32, ZIP |
| Integration | Jest + jsdom | `contentScript.js` message handlers, scheduling, bundle export                      |
| End-to-end  | Playwright   | Real-page scrape, page-cap self-loop, dedup, filters, `.zip` download               |

```bash
npm test          # Jest unit + integration
npm run test:e2e  # Playwright e2e (run `npx playwright install` once first)
npm run test:all  # everything
```

---

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

# Unit tests (Jest)
npm test

# End-to-end tests (Playwright — requires `npx playwright install` once)
npm run test:e2e

# All tests
npm run test:all

# Build documentation
npm run docs
```

---

## Documentation

Full documentation is available at [ReadTheDocs](https://do-audit-log-scraper.readthedocs.io/)
or build locally:

```bash
pip install sphinx sphinx-rtd-theme
cd docs && sphinx-build -b html source _build/html
open _build/html/index.html
```

---

## Contributing

Contributions are welcome! Please consider:

- Testing with different DigitalOcean account types
- Reporting issues with specific audit log formats
- Suggesting additional forensic features
- Improving data extraction reliability

See [CONTRIBUTING](docs/source/contributing.rst) for detailed guidelines.

---

## Changelog

### v2.2 (2026)

**New Features:**

- Date-range filter + export (UTC timestamp window)
- Cross-page deduplication (toggleable)
- Automated scheduling (1 min – 7 days, persisted)
- Evidence bundle: dependency-free ZIP with CSV, JSON, metadata, SHA-256 manifest, README

**Hardening:**

- Pagination page-cap (`MAX_SCRAPE_PAGES` = 100) + origin validation
- ZIP path-traversal protection (`sanitiseZipEntryName`)
- CSV injection protection retained for all exports

**Testing:**

- Jest unit tests + Playwright e2e suite (`npm test`, `npm run test:e2e`)

### v2.1 (2025)

**Bug Fixes:**

- Fixed broken pagination (replaced with background-mediated tab scraping)
- Fixed invalid `:contains()` CSS selector in `getNextPageUrl()`
- Fixed `sendMessage` response destructuring in popup.js
- Fixed message display (CSS classes instead of ID mutation)
- Verified `URL.createObjectURL` is available in the MV3 service worker (modern Chrome)
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

**Note**: This tool remains necessary due to DigitalOcean's continued lack of
API support for audit log export as of 2026. We will continue to maintain and
update this tool until DigitalOcean provides native API functionality.

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
