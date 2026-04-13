.. _usage:

Usage
=====

Basic Workflow
--------------

1. Navigate to the `DigitalOcean Security Page <https://cloud.digitalocean.com/account/security>`_
2. Click the DO Audit Log Scraper extension icon in the toolbar
3. Configure your export options
4. Click **Scrape Audit Logs** (current page) or **Scrape All Pages** (complete history)

Export Options
--------------

Format
~~~~~~

.. list-table::
   :header-rows: 1

   * - Format
     - Description
     - Use Case
   * - CSV
     - Comma-separated values with headers
     - Spreadsheet analysis, SIEM import
   * - JSON
     - Structured JSON with nested metadata
     - Programmatic processing, API integration

Checkbox Options
~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1

   * - Option
     - Default
     - Description
   * - Include forensic metadata
     - On
     - Adds tool version, timestamps, browser info, and source URL
   * - Generate SHA-256 hash
     - On
     - Creates a SHA-256 hash of the exported data for integrity verification
   * - Add timestamp to filename
     - On
     - Appends ISO 8601 timestamp to the download filename

CSV Output Format
-----------------

The CSV export includes the following columns:

.. list-table::
   :header-rows: 1

   * - Column
     - Description
   * - Action
     - The action performed (e.g., "login", "droplet.create")
   * - User
     - Full name of the user who performed the action
   * - IP Address
     - Source IP address of the action
   * - Time
     - Relative time string (e.g., "2 hours ago")
   * - UTC_Timestamp
     - ISO 8601 UTC timestamp from the page
   * - Local_Timestamp
     - Local timestamp from tooltip
   * - Scraped_At_UTC
     - Exact UTC time when the entry was scraped

When **Include forensic metadata** is enabled, a comment line is prepended
to the CSV containing the forensic metadata as a JSON object.

JSON Output Format
------------------

.. code-block:: json

   {
     "metadata": {
       "tool": "DO Audit Log Scraper",
       "version": "2.0",
       "exportedAt": "2025-01-11T12:00:00.000Z",
       "exportedBy": "IONSEC Forensic Tools",
       "source": "DigitalOcean Security Audit Logs",
       "sourceUrl": "https://cloud.digitalocean.com/account/security",
       "recordCount": 150,
       "browserInfo": {
         "userAgent": "...",
         "platform": "Win32",
         "language": "en-US"
       },
       "dataHash": {
         "algorithm": "SHA-256",
         "value": "abc123..."
       }
     },
     "auditLogs": [
       {
         "Action": "login",
         "User": "John Doe",
         "IP Address": "203.0.113.1",
         "Time": "2 hours ago",
         "UTC_Timestamp": "2025-01-11T10:00:00Z",
         "Local_Timestamp": "2025-01-11 12:00:00",
         "Scraped_At_UTC": "2025-01-11T12:05:00.000Z"
       }
     ]
   }

Pagination
----------

**Scrape All Pages** automatically navigates through all available pages of audit
logs using the pagination controls on the DigitalOcean UI.

.. warning::

   Scraping all pages may take significant time for accounts with extensive
   audit history. The browser tab must remain active during the process.

Verifying Data Integrity
-------------------------

After export, you can verify the SHA-256 hash:

**On Linux/macOS:**

.. code-block:: bash

   # For JSON exports (hash covers the auditLogs array)
   shasum -a 256 do_audit_logs_2025-01-11T12-00-00.json

**On Windows (PowerShell):**

.. code-block:: powershell

   Get-FileHash -Algorithm SHA256 do_audit_logs_2025-01-11T12-00-00.json
