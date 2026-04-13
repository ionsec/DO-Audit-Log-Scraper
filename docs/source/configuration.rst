.. _configuration:

Configuration
=============

The extension provides the following options accessible through the popup UI:

Export Format
-------------

.. list-table::
   :header-rows: 1

   * - Option
     - Values
     - Default
   * - Format
     - ``csv``, ``json``
     - ``csv``

Forensic Options
----------------

.. list-table::
   :header-rows: 1

   * - Option
     - Type
     - Default
     - Description
   * - includeMetadata
     - boolean
     - ``true``
     - Embed forensic metadata in the export
   * - includeHash
     - boolean
     - ``true``
     - Generate SHA-256 integrity hash
   * - timestampFilename
     - boolean
     - ``true``
     - Add ISO 8601 timestamp to filename

Manifest Configuration
----------------------

The extension manifest (``manifest.json``) defines:

- **Manifest version**: 3 (current Chrome extension standard)
- **Content script injection**: Automatic on ``cloud.digitalocean.com/account/security*``
- **Content Security Policy**: ``script-src 'self'; object-src 'none'``
- **Host permissions**: Restricted to ``https://cloud.digitalocean.com/*``

.. note::

   The ``storage`` permission is declared but not currently used for persisting
   settings. Future versions will use it to remember user preferences.
