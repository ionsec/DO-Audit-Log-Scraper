.. _forensics:

Forensic Guidelines
===================

This section covers best practices for using the DO Audit Log Scraper in forensic
investigations and compliance scenarios.

Chain of Custody
----------------

The extension supports chain of custody requirements through:

1. **Scraped-At Timestamps** — Every entry records the exact UTC time it was extracted
2. **SHA-256 Data Hash** — Verifiable integrity hash of the exported data
3. **Forensic Metadata** — Tool version, browser information, source URL, and export timestamp
4. **Timestamped Filenames** — ISO 8601 timestamps in filenames prevent accidental overwrites

Recommended Workflow
--------------------

For forensic evidence collection:

1. **Document the investigation** — Record the purpose and authorization
2. **Navigate to the security page** — Use a clean browser profile
3. **Enable all forensic options** — Metadata, hash, and timestamped filename
4. **Export in JSON format** — JSON preserves structure and is self-documenting
5. **Export in CSV format** — CSV is widely compatible with analysis tools
6. **Verify the hash** — Compare the SHA-256 hash in metadata against a fresh calculation
7. **Store both exports** — Keep original files in a secure, backed-up location
8. **Document the export** — Record date, time, investigator, and case number

Evidence Packaging
------------------

.. todo::

   Add ZIP-based evidence packaging with separate hash manifest file.

For maximum evidentiary value, store the following together:

- The JSON export (with embedded metadata and hash)
- The CSV export (for tool compatibility)
- A separate ``SHA256SUMS`` file containing the hash
- A written chain-of-custody log

Data Integrity Verification
----------------------------

To verify the integrity of a previously exported file:

.. code-block:: bash

   # Extract the hash from JSON metadata
   cat do_audit_logs.json | python3 -c "
     import json, sys, hashlib
     data = json.load(sys.stdin)
     claimed_hash = data['metadata']['dataHash']['value']
     actual_hash = hashlib.sha256(
       json.dumps(data['auditLogs']).encode()
     ).hexdigest()
     print(f'Claimed: {claimed_hash}')
     print(f'Actual:  {actual_hash}')
     print(f'Match:   {claimed_hash == actual_hash}')
   "

Limitations for Forensic Use
-----------------------------

- **User identification** relies on full names displayed in the DO UI, which may be spoofed
- **No real-time monitoring** — The extension requires manual triggering
- **UI-dependent** — Data is limited to what DigitalOcean renders in the web interface
- **No signed exports** — Exports are not cryptographically signed by the extension
- **Browser state** — Extensions and browser settings may affect extraction

.. warning::

   This tool is intended for legitimate forensic and compliance purposes only.
   Ensure you have proper authorization before collecting audit data.
