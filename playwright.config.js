// DO Audit Log Scraper — Playwright e2e config.
// Serves the mock DigitalOcean security page fixture so the content script can
// be driven against a realistic DOM.
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:8787",
    acceptDownloads: true,
  },
  webServer: {
    command: "node tests/fixtures/serve.js",
    url: "http://127.0.0.1:8787/security-page.html",
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
