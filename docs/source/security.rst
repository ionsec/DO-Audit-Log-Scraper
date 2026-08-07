.. _security:

Security
========

Security Model
--------------

The extension is designed with a defense-in-depth approach:

1. **Local processing only** — All data extraction and formatting happens in the browser
2. **No external network calls** — No data is transmitted to any server
3. **No credential storage** — The extension never stores or transmits credentials
4. **Strict host permissions** — Content script runs only on DigitalOcean security pages
5. **Content Security Policy** — Restricts script and object sources to ``'self'``
6. **Manifest V3** — Uses Chrome's latest, most restrictive extension security model

Security Controls (v2.2)
------------------------

The following controls are implemented and enforced:

CSV Formula-Injection Protection
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Every CSV cell (scrape, filter, and evidence-bundle exports) is run through
``sanitiseCSVCell`` / ``escapeCSV`` (``lib/core.js``). Cells starting with
``=``, ``+``, ``-``, ``@``, tab, or carriage return are tab-prefixed so a
spreadsheet never interprets them as formulas. A UTF-8 BOM is prepended for
correct Excel rendering.

Pagination URL Validation + Page Cap
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Every pagination URL is validated against the ``cloud.digitalocean.com`` origin
before use (``nextUrlWithCap``), and a hard page cap of ``MAX_SCRAPE_PAGES``
(100) bounds any single "all pages" run, preventing runaway/infinite scrape
loops from a broken or manipulated pagination chain.

ZIP Path-Traversal Protection
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

All evidence-bundle ZIP entry names pass through ``sanitiseZipEntryName``,
which strips ``..`` segments, absolute paths, and control characters, so a
crafted base name cannot escape the archive directory.

No External Dependencies
~~~~~~~~~~~~~~~~~~~~~~~~

All runtime code (including the ZIP writer and CRC-32) is dependency-free and
bundled. The popup uses inline SVG icons — no CDN, no supply-chain surface, no
CSP violations. CSP remains ``script-src 'self'; object-src 'none'``.

Scheduling Bounds
~~~~~~~~~~~~~~~~~

Automated-scheduling intervals are clamped by ``validateScheduleMinutes`` to
``[1, 10080]`` minutes (1 minute – 7 days), and a ``scheduleInFlight`` guard
prevents overlapping scrape runs.

Known Security Considerations
------------------------------

DOM-Based Injection
~~~~~~~~~~~~~~~~~~~

The content script reads text content from the DOM without HTML sanitization.
While the data is exported rather than rendered, a compromised DigitalOcean page
could inject crafted content into the extracted values. CSV sanitisation
mitigates the spreadsheet-formula vector, but the raw values are not otherwise
filtered.

**Recommendation**: Treat exported data as untrusted; review high-entropy
values before opening in an analysis tool.

.. warning::

   The extension operates on the assumption that the DigitalOcean web interface
   is trustworthy. If the DigitalOcean control panel is compromised, the
   extracted data cannot be trusted.

Browser Permissions
-------------------

The extension requests the minimum permissions required:

- ``activeTab`` — Needed to check the current page URL
- ``downloads`` — Needed to save exported files
- ``storage`` — Declared for future preferences persistence
- ``scripting`` — Needed for programmatic script injection
- Host permission — Restricted to ``cloud.digitalocean.com`` only
