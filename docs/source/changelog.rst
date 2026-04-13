.. _changelog:

Changelog
=========

v2.1 (2025)
-----------

**Bug Fixes:**

- Fixed pagination — ``navigateToPage()`` destroyed the content script context; replaced with background-mediated tab scraping
- Fixed invalid CSS selector ``:contains('Next')`` (jQuery-only) in ``getNextPageUrl()``
- Fixed ``sendMessage`` response destructuring bug in popup.js
- Fixed ``showInfo()`` reusing success style instead of its own
- Fixed message div ID mutation causing subsequent lookups to fail
- Fixed ``URL.createObjectURL`` call in Manifest V3 service worker (not available)
- Fixed dead code: removed unused ``action.onClicked`` and ``getTabInfo`` handlers
- Removed legacy ``scrape_data_legacy`` message handler

**Security:**

- Added CSV formula-injection protection (prefix ``=``, ``+``, ``-``, ``@`` cells with tab)
- Removed external Font Awesome CDN dependency (replaced with inline SVGs + SRI-safe)
- Added origin validation for pagination URLs
- Added UTF-8 BOM to CSV exports for proper Excel handling

**New Features:**

- **Real-time monitoring** — MutationObserver watches for new audit log entries and sends Chrome notifications
- **Search/filter** — Filter by user, action, or IP before exporting
- **Copy to clipboard** — Quick-copy CSV data to clipboard
- **Export filtered** — Download only matching entries
- **Keyboard shortcut** — ``Ctrl+Shift+S`` (Mac: ``Cmd+Shift+S``) to scrape current page
- **Storage persistence** — Export options saved across sessions via ``chrome.storage.local``
- **Chrome notifications** — Alert on new audit log entries detected by monitor

**Modernization:**

- Added ``package.json`` with lint/format/docs scripts
- Added ESLint with ``standard`` config + webextensions globals
- Added Prettier config
- Added ``.gitignore``
- Added full Sphinx ReadTheDocs documentation (10 RST pages)
- Added ``.readthedocs.yaml`` for auto-deploy
- Bumped version to 2.1

v2.0 (2025)
-----------

- Migrated to Manifest V3
- Added JSON export format
- Implemented SHA-256 hash generation
- Added forensic metadata collection
- Enhanced error handling and data validation
- Added pagination support for multiple pages
- Improved security with strict host permissions
- Updated UI with modern dark theme

v1.0 (2024)
-----------

- Initial release
- Basic CSV export functionality
- Manifest V2 implementation
