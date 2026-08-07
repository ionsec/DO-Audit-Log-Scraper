// DO Audit Log Scraper — Jest environment setup (runs before each test file).
// Makes lib/core.js available and polyfills jsdom gaps used by the extension.

// Expose the pure-logic module the same way lib/core.js does for content scripts.
const core = require("../lib/core.js");
globalThis.DOAuditCore = core;

// jsdom does not expose Node's TextEncoder/TextDecoder or crypto.subtle.
const { TextEncoder, TextDecoder } = require("util");
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder;
}
// Ensure crypto.subtle is available. jsdom's crypto often lacks `subtle`, and
// the global property may be read-only, so define it defensively.
if (!(globalThis.crypto && globalThis.crypto.subtle)) {
  try {
    Object.defineProperty(globalThis, "crypto", {
      value: require("crypto").webcrypto,
      configurable: true,
      writable: true,
    });
  } catch (err) {
    globalThis.crypto = require("crypto").webcrypto;
  }
}

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock://url";
  URL.revokeObjectURL = () => {};
}

// Build a controllable `chrome` mock. The returned object exposes the
// registered onMessage listener so tests can drive the content script.
function createChromeMock() {
  let listener = null;
  const mock = {
    runtime: {
      onMessage: {
        addListener(fn) {
          listener = fn;
        },
      },
      sendMessage: jest.fn().mockResolvedValue({}),
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue({}),
      },
      onChanged: { addListener: jest.fn() },
    },
    tabs: { sendMessage: jest.fn().mockResolvedValue({}) },
    _listener() {
      return listener;
    },
  };
  return mock;
}

globalThis.__createChromeMock = createChromeMock;

// Convenience to send a message through the content script's onMessage handler
// and await the (possibly asynchronous) response.
function sendContentMessage(listener, message) {
  return new Promise((resolve) => {
    listener(message, {}, resolve);
  });
}
globalThis.__sendContentMessage = sendContentMessage;
