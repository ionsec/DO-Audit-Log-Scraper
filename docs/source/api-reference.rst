.. _api-reference:

API Reference
=============

This section documents the internal APIs of the extension's JavaScript modules.

Content Script (contentScript.js)
---------------------------------

.. js:function:: generateSHA256(data)

   Generates a SHA-256 hash of the provided data using the Web Crypto API.

   :param string data: The string data to hash
   :returns: Hex-encoded SHA-256 hash string
   :rtype: Promise<string>

   .. code-block:: javascript

      const hash = await generateSHA256(JSON.stringify(auditLogs));

.. js:function:: extractAuditLogData()

   Extracts audit log data from the current page's table element.

   :returns: Object with ``headers``, ``data``, and ``count`` properties, or ``null`` on failure
   :rtype: object|null

   The returned object structure::

      {
        headers: ["Action", "User", "IP Address", "Time",
                  "UTC_Timestamp", "Local_Timestamp", "Scraped_At_UTC"],
        data: [[...], [...], ...],
        count: 25
      }

.. js:function:: getNextPageUrl()

   Checks for a pagination "next" link on the current page.

   :returns: The URL of the next page, or ``null`` if no next page exists
   :rtype: string|null

.. js:function:: navigateToPage(url)

   Navigates the browser to the specified URL and waits for the page to load.

   :param string url: The URL to navigate to
   :returns: Resolves when the page has finished loading
   :rtype: Promise<void>

.. js:function:: formatAsCSV(headers, data)

   Converts headers and row data to a CSV string with proper escaping.

   :param Array<string> headers: Column header names
   :param Array<Array<string>> data: Row data arrays
   :returns: Formatted CSV string
   :rtype: string

   Values containing commas, quotes, or newlines are properly escaped per RFC 4180.

.. js:function:: createForensicMetadata(data, options)

   Creates a forensic metadata object for the exported data.

   :param Array data: The audit log data array
   :param object options: Export options (``includeHash``, etc.)
   :returns: Forensic metadata object with optional SHA-256 hash
   :rtype: Promise<object>

.. js:function:: generateFilename(format, includeTimestamp)

   Generates a download filename with optional timestamp.

   :param string format: File extension (``csv`` or ``json``)
   :param boolean includeTimestamp: Whether to append a timestamp
   :returns: Generated filename
   :rtype: string

.. js:function:: downloadData(data, filename, format)

   Creates a Blob and triggers a browser download.

   :param string|object data: The data to download
   :param string filename: The download filename
   :param string format: ``csv`` or ``json``
   :rtype: Promise<void>

.. js:function:: scrapeData(options)

   Main scraping function. Extracts audit log data from the current page (and
   optionally all paginated pages), formats it, and triggers a download.

   :param object options: Export configuration
   :param string options.format: ``csv`` or ``json`` (default ``csv``)
   :param boolean options.includeMetadata: Include forensic metadata (default ``true``)
   :param boolean options.includeHash: Generate SHA-256 hash (default ``true``)
   :param boolean options.timestampFilename: Timestamp the filename (default ``true``)
   :param boolean options.allPages: Scrape all paginated pages (default ``false``)
   :returns: Result object with ``success``, ``count``, and ``pages`` properties
   :rtype: Promise<object>

.. js:function:: getPageStats()

   Returns statistics about the audit log entries on the current page.

   :returns: Object with ``rowCount`` and ``hasNextPage`` properties
   :rtype: object

Pure Logic Module (lib/core.js)
-------------------------------

Since v2.2, all DOM/chrome-free logic lives in ``lib/core.js``, a UMD module that
defines ``globalThis.DOAuditCore`` when loaded as a script (listed before
``contentScript.js`` in the manifest) and exports via CommonJS for Jest. It is
intentionally free of ``document``, ``window``, and ``chrome.*`` references.

.. js:function:: generateSHA256(data)

   Computes a hex SHA-256 digest of ``data`` via ``crypto.subtle``.

   :param any data: Value to hash
   :returns: Hex digest string
   :rtype: Promise<string>

.. js:function:: sanitiseCSVCell(value)

   Neutralizes CSV formula injection by tab-prefixing cells that start with ``=``, ``+``, ``-``, ``@``, tab, or carriage return.

   :returns: Sanitised cell string

.. js:function:: escapeCSV(value)

   CSV-escapes a cell (quoting and doubling embedded quotes/newlines/commas) after sanitisation.

   :returns: Escaped CSV cell string

.. js:function:: filterAuditLogs(data, headers, filters)

   Case-insensitive substring filter across the given column names.

   :param array data: Row array
   :param array headers: Column names
   :param object filters: ``{ ColumnName: "needle" }``
   :returns: Filtered rows

.. js:function:: filterAuditLogsByDateRange(data, headers, options)

   Filters rows to a UTC timestamp window by comparing the ``UTC_Timestamp`` column.

   :param object options: ``{ from: string, to: string }`` (Date.parse-able)
   :returns: Rows inside the window; unparseable rows excluded when a bound is set

.. js:function:: deduplicateRows(data, headers, options)

   Removes rows that repeat across pages. Default key = the source columns
   *before* the 3 appended headers (``Scraped_At_UTC`` is excluded).

   :param object options: ``{ enabled: bool, keyColumns?: string[] }``

.. js:function:: nextUrlWithCap(currentUrl, visitedCount, options)

   Returns a validated next-page URL, or ``null`` when the origin is not
   allowed, the URL is malformed, or the page cap is reached.

   :param object options: ``{ maxPages?: int, allowedOrigin?: string }``

.. js:function:: validateScheduleMinutes(n)

   Clamps an interval (minutes) to ``[1, 10080]`` (1 minute – 7 days).

.. js:function:: crc32(bytes)

   Table-based CRC-32 (IEEE 802.3); test vector ``0xCBF43926`` for ``"123456789"``.

   :param Uint8Array bytes: Input
   :returns: CRC-32 as unsigned int

.. js:function:: sanitiseZipEntryName(name)

   Strips ``..``, absolute paths, and control characters from a ZIP entry name to prevent path traversal.

.. js:function:: buildZip(entries)

   Dependency-free STORE (uncompressed) ZIP writer. Returns a ``Uint8Array``.

   :param array entries: ``[{ name: string, data: Uint8Array|string }]``

.. js:function:: buildEvidenceBundle(artifacts)

   Assembles the five forensic artifacts (``README.txt``, ``audit_logs.csv``,
   ``audit_logs.json``, ``metadata.json``, ``SHA256SUMS.txt``) into a ZIP.

   :param object artifacts: ``{ baseName, csv, json, metadata, hash, readme }``

Message Protocol
----------------

The content script listens for the following messages via ``chrome.runtime.onMessage``:

.. list-table::
   :header-rows: 1

   * - Message
     - Payload
     - Response
   * - ``scrape_data``
     - ``{ options: {...} }``
     - ``{ success: bool, count: int, pages: int }``
   * - ``get_stats``
     - None
     - ``{ rowCount: int, hasNextPage: bool }``
   * - ``filter_data``
     - ``{ filters: {...}, dateRange?: { from, to } }``
     - ``{ success: bool, count: int, csv: string, data: array }``
   * - ``update_schedule``
     - None (reads persisted ``scheduleConfig``)
     - ``{ success: bool, enabled: bool, intervalMinutes: int }``
   * - ``export_bundle``
     - ``{ options: {...} }``
     - ``{ success: bool, count: int }``

Background Service Worker (background.js)
-----------------------------------------

.. js:function:: onMessage(request, sender, sendResponse)

   Handles messages from content script and popup.

   Supported actions:

   ``downloadData``
     Downloads data as a Blob via ``chrome.downloads`` API.

     :param string data: The data to download
     :param string filename: The target filename
     :param string format: ``json`` or ``csv``
     :returns: ``{ success: true, downloadId: int }``

   ``getTabInfo``
     Returns the currently active tab.

     :returns: ``{ tab: Tab }``

Popup (popup.js)
----------------

The popup script manages the UI and communicates with the content script.

.. js:function:: showSuccess(message)

   Displays a success notification in the popup.

   :param string message: The message to display

.. js:function:: showError(message)

   Displays an error notification in the popup.

   :param string message: The message to display

.. js:function:: showWarning(message)

   Displays a warning notification in the popup.

   :param string message: The message to display

.. js:function:: showInfo(message)

   Displays an informational notification in the popup.

   :param string message: The message to display
