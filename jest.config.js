// DO Audit Log Scraper — Jest unit-test config
module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  clearMocks: true,
  restoreMocks: true,
};
