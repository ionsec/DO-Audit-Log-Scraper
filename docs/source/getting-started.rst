.. _getting-started:

Getting Started
===============

Prerequisites
-------------

- Google Chrome v88+ (or any Chromium-based browser: Edge, Brave, etc.)
- A DigitalOcean account with access to the Security page
- The extension source files (clone or download the repository)

Installation
------------

1. Clone or download the repository::

    git clone https://github.com/your-repo/DO-Audit-Log-Scraper.git

2. Open Google Chrome and navigate to::

    chrome://extensions/

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **Load unpacked** and select the repository folder

5. The extension icon will appear in your browser toolbar

Verifying Installation
----------------------

After loading the extension:

1. Navigate to the DigitalOcean Security page
2. Click the extension icon in the toolbar
3. You should see a green status dot with "Ready to scrape"
4. If you see a red dot, ensure you're on the correct page

File Structure
--------------

The extension consists of the following key files:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - File
     - Description
   * - ``manifest.json``
     - Extension manifest (Manifest V3)
   * - ``popup.html``
     - Popup UI with export options
   * - ``popup.js``
     - Popup interaction logic
   * - ``background.js``
     - Service worker for downloads and messaging
   * - ``contentScript.js``
     - Content script that extracts audit log data
   * - ``icons/``
     - Extension icons (16px, 48px, 128px)
