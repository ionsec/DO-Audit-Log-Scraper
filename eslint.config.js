// DO Audit Log Scraper — flat ESLint config (ESLint >= 9)
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "docs/_build/**",
      "tests/**",
      "jest.config.js",
      "playwright.config.js",
    ],
  },
  js.configs.recommended,
  {
    // The flat config file itself is CommonJS (require/module.exports).
    files: ["eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: globals.node,
    },
  },
  {
    files: ["*.js", "lib/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // lib/core.js is a UMD module: its CommonJS export guard references
        // `module`/`require`, and contentScript.js reads the shared global.
        ...globals.commonjs,
        chrome: "readonly",
        crypto: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
