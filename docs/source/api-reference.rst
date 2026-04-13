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
   * - ``scrape_data_legacy``
     - None
     - ``{ message: "data_scraped" | "error" }``

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
