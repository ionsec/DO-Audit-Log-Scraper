.. _architecture:

Architecture
============

The extension follows the standard Chrome Extension Manifest V3 architecture with
three main components communicating via the Chrome messaging API.

Component Overview
------------------

+-------------------------------+-------------------------------+
| Component                     | Role                          |
+===============================+===============================+
| popup.html / popup.js         | User interface                |
+-------------------------------+-------------------------------+
| contentScript.js              | Page interaction & extraction |
+-------------------------------+-------------------------------+
| background.js                 | Service worker (downloads)    |
+-------------------------------+-------------------------------+

Message Flow::

  User clicks "Scrape"
    → Popup sends scrape_data to Content Script
    → Content Script extracts data from DOM
    → Content Script generates metadata + hash
    → Content Script triggers download
    → Content Script returns result to Popup
    → Popup displays success/error message

Popup (popup.html / popup.js)
------------------------------

The popup is the user-facing interface. It provides:

- Page status detection (correct URL check)
- Export format selection (CSV / JSON)
- Forensic option toggles
- Scraping trigger buttons
- Status and error message display

The popup communicates with the content script via ``chrome.tabs.sendMessage()``
and receives async responses.

Content Script (contentScript.js)
----------------------------------

The content script runs in the context of the DigitalOcean security page.
It is responsible for:

- DOM interaction and data extraction from the audit log table
- SHA-256 hash generation via the Web Crypto API
- CSV formatting and JSON structuring
- Forensic metadata collection
- File download initiation
- Pagination detection and navigation

.. note::

   The content script injects into pages matching
   ``https://cloud.digitalocean.com/account/security*`` only.

Background Service Worker (background.js)
-----------------------------------------

The Manifest V3 service worker handles:

- Download management via the ``chrome.downloads`` API
- Tab information queries
- Extension lifecycle events (``onInstalled``)

Permissions
-----------

.. list-table::
   :header-rows: 1

   * - Permission
     - Justification
   * - ``activeTab``
     - Access the current tab for URL checking
   * - ``downloads``
     - Save exported audit log files
   * - ``storage``
     - Persist user preferences (future use)
   * - ``scripting``
     - Execute content scripts programmatically
   * - Host: ``cloud.digitalocean.com``
     - Limited to DigitalOcean security pages only
