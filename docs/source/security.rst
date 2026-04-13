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

Known Security Considerations
------------------------------

External CDN Dependency
~~~~~~~~~~~~~~~~~~~~~~~

The popup UI loads Font Awesome icons from ``cdnjs.cloudflare.com``. This:

- Creates a network dependency contradicting the "no external dependencies" claim
- Could be blocked by the Content Security Policy
- Introduces a potential supply-chain risk
- Lacks Subresource Integrity (SRI) verification

**Recommendation**: Bundle Font Awesome SVGs locally or use inline SVG icons.

CSV Injection
~~~~~~~~~~~~~

Extracted data is written directly to CSV without sanitizing for formula injection.
A malicious value in the DigitalOcean UI (e.g., ``=CMD(...)``) could be interpreted
as a formula when the CSV is opened in a spreadsheet application.

**Recommendation**: Prefix cells starting with ``=``, ``+``, ``-``, or ``@`` with a
tab character or single quote to neutralize formula interpretation.

DOM-Based Injection
~~~~~~~~~~~~~~~~~~~

The content script reads text content from the DOM without HTML sanitization.
While the data is exported rather than rendered, a compromised DigitalOcean page
could inject crafted content.

**Recommendation**: Sanitize extracted values before export.

Pagination URL Validation
~~~~~~~~~~~~~~~~~~~~~~~~~

The pagination feature extracts URLs from the DOM and navigates to them. A
manipulated DOM could redirect the browser to a malicious URL.

**Recommendation**: Validate that pagination URLs match the expected
``cloud.digitalocean.com`` domain pattern before navigation.

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
