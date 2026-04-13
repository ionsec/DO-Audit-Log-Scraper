.. DO Audit Log Scraper documentation master file

DO Audit Log Scraper - Forensic Edition
========================================
.. versionadded:: 2.0

The **DO Audit Log Scraper** is a Chrome extension that fills the critical gap in
DigitalOcean's ability to export audit log data via API. As of 2025, DigitalOcean
still does not provide API access for audit log export, making this tool essential
for the DFIR (Digital Forensics and Incident Response) community.

.. toctree::
   :maxdepth: 3
   :caption: Contents:

   getting-started
   usage
   architecture
   forensics
   configuration
   security
   api-reference
   contributing
   changelog


Why This Tool Matters
---------------------
Despite the growing importance of security auditing and compliance, DigitalOcean
continues to lack:

- API endpoints for audit log export
- Programmatic access to security history
- Built-in export functionality for audit logs

The security history remains accessible **only through the web UI**, making this
Chrome extension the primary solution for:

- Forensic investigations
- Compliance reporting
- Security incident analysis
- Audit trail preservation

Key Features
------------

- **SHA-256 Hash Generation** — Automatic hash calculation for data integrity verification
- **Forensic Metadata** — Comprehensive metadata including timestamps, browser info, and export parameters
- **Timestamped Exports** — Automatic timestamp addition to filenames for better organization
- **Multiple Export Formats** — CSV and JSON with optional forensic metadata
- **Pagination Support** — Automatically scrape multiple pages of audit logs
- **Manifest V3** — Updated to Chrome's latest extension security model
- **Zero External Dependencies** — All processing done locally for security

About IONSEC
------------
IONSEC is a boutique cybersecurity services company specializing in advanced threat
response, digital forensics and incident response (DFIR), security architecture and
compliance, and tailor-made security solutions.

- **Website**: https://ionsec.io
- **Emergency Response**: https://ionsec.io/panicmode
- **Email**: info@ionsec.io
