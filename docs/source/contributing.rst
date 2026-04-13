.. _contributing:

Contributing
============

Contributions are welcome! Areas of particular interest:

- Testing with different DigitalOcean account types
- Reporting issues with specific audit log formats
- Suggesting additional forensic features
- Improving data extraction reliability

Development Setup
-----------------

1. Clone the repository::

    git clone https://github.com/your-repo/DO-Audit-Log-Scraper.git

2. Load the extension in Chrome (see :ref:`getting-started`)

3. Make your changes and test on the DigitalOcean security page

Building Documentation
----------------------

The project uses Sphinx with the ReadTheDocs theme::

    pip install sphinx sphinx-rtd-theme
    cd docs
    sphinx-build -b html source _build/html

Open ``docs/_build/html/index.html`` in your browser to view.

Reporting Issues
----------------

- **Bug reports**: Open a GitHub Issue with steps to reproduce
- **Feature requests**: Open a GitHub Issue with the ``enhancement`` label
- **Security vulnerabilities**: Email info@ionsec.io (do not file public issues)

Code Style
----------

- Use ``const``/``let`` (never ``var``)
- Use ``async``/``await`` over raw promises
- Use template literals for string interpolation
- Prefer ``querySelector`` over ``getElementById``/``getElementsByClassName``
- Handle errors with ``try``/``catch`` blocks
- Add JSDoc comments for all public functions

Submitting Changes
------------------

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on the DigitalOcean security page
5. Submit a pull request with a clear description
