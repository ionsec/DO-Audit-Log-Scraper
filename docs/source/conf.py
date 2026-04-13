# -- DO Audit Log Scraper Sphinx Configuration ----------------------------

project = "DO Audit Log Scraper"
copyright = "2025, IONSEC"
author = "IONSEC"

release = "2.0"
version = "2.0"

# -- General configuration ---------------------------------------------------
extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.viewcode",
    "sphinx.ext.todo",
    "sphinx.ext.ifconfig",
]

templates_path = ["_templates"]
exclude_patterns = []
source_suffix = ".rst"
master_doc = "index"

# -- Options for HTML output -------------------------------------------------
html_theme = "sphinx_rtd_theme"
html_static_path = ["_static"]
html_logo = "../../images/logo.png"

# -- Options for todo --------------------------------------------------------
todo_include_todos = True
