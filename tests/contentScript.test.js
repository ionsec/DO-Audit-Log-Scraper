// DO Audit Log Scraper — integration tests that load contentScript.js in jsdom
// with a controllable chrome mock, then drive its onMessage handler.

let chromeMock;
let listener;

beforeEach(() => {
  jest.useRealTimers();
  chromeMock = globalThis.__createChromeMock();
  globalThis.chrome = chromeMock;
  // Default storage.get: scheduleConfig present/absent controllable per test.
  chromeMock.storage.local.get.mockImplementation(async (key) => {
    if (key === "scheduleConfig") {
      return {
        scheduleConfig: {
          enabled: false,
          intervalMinutes: 60,
        },
      };
    }
    return {};
  });
  jest.resetModules();
  require("../contentScript.js");
  listener = chromeMock._listener();
});

afterEach(() => {
  jest.useRealTimers();
  document.body.innerHTML = "";
});

function buildTableHtml() {
  return `
    <table>
      <thead><tr><th>Action</th><th>User</th><th>IP Address</th><th>Time</th></tr></thead>
      <tbody>
        <tr>
          <td>login</td><td><a href="#">Alice Smith</a></td><td>203.0.113.1</td>
          <td class="created_at"><time datetime="2025-06-01T10:00:00Z">1m</time></td>
        </tr>
        <tr>
          <td>delete_droplet</td><td><a href="#">Bob Jones</a></td><td>198.51.100.2</td>
          <td class="created_at"><time datetime="2025-06-02T11:30:00Z">2m</time></td>
        </tr>
      </tbody>
    </table>`;
}

function sendMessage(message) {
  return globalThis.__sendContentMessage(listener, message);
}

// scrapeData logs "Starting audit log scrape with options:" as the first arg.
function loggedScrapes(logSpy) {
  return logSpy.mock.calls.filter((args) =>
    String(args[0]).includes("Starting audit log scrape")
  ).length;
}

describe("message: get_stats", () => {
  test("reports row count and next-page availability", async () => {
    document.body.innerHTML = buildTableHtml() + '<nav class="pagination"><a rel="next" href="https://cloud.digitalocean.com/security?page=2">Next</a></nav>';
    const res = await sendMessage({ message: "get_stats" });
    expect(res.rowCount).toBe(2);
    expect(res.hasNextPage).toBe(true);
  });
});

describe("message: filter_data", () => {
  test("combines text filter and date range", async () => {
    document.body.innerHTML = buildTableHtml();
    const res = await sendMessage({
      message: "filter_data",
      filters: { User: "alice" },
      dateRange: { from: "2025-06-01T00:00:00Z", to: "2025-06-01T23:59:59Z" },
    });
    expect(res.success).toBe(true);
    expect(res.count).toBe(1);
    expect(res.csv).toContain("Alice Smith");
  });

  test("date range excludes out-of-window rows", async () => {
    document.body.innerHTML = buildTableHtml();
    const res = await sendMessage({
      message: "filter_data",
      filters: {},
      dateRange: { from: "2025-06-02T00:00:00Z", to: "2025-06-02T23:59:59Z" },
    });
    expect(res.count).toBe(1);
    expect(res.data[0][0]).toBe("delete_droplet");
  });
});

describe("automated scheduling", () => {
  test("enabling a schedule triggers a scrape after the interval", async () => {
    jest.useFakeTimers();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    chromeMock.storage.local.get.mockImplementation(async (key) => {
      if (key === "scheduleConfig") {
        return {
          scheduleConfig: {
            enabled: true,
            intervalMinutes: 1,
            format: "csv",
            includeMetadata: false,
            includeHash: false,
            timestampFilename: false,
            allPages: false,
            deduplicate: true,
          },
        };
      }
      return {};
    });

    await sendMessage({ message: "update_schedule" });
    expect(loggedScrapes(logSpy)).toBe(0);

    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(loggedScrapes(logSpy)).toBeGreaterThan(0);
    logSpy.mockRestore();
  });

  test("disabling a schedule stops future scrapes", async () => {
    jest.useFakeTimers();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    chromeMock.storage.local.get.mockImplementation(async (key) => {
      if (key === "scheduleConfig") {
        return { scheduleConfig: { enabled: true, intervalMinutes: 1, format: "csv" } };
      }
      return {};
    });
    await sendMessage({ message: "update_schedule" });

    // Now disable it.
    chromeMock.storage.local.get.mockImplementation(async (key) => {
      if (key === "scheduleConfig") {
        return { scheduleConfig: { enabled: false, intervalMinutes: 1 } };
      }
      return {};
    });
    await sendMessage({ message: "update_schedule" });

    await jest.advanceTimersByTimeAsync(3 * 60 * 1000);
    expect(loggedScrapes(logSpy)).toBe(0);
    logSpy.mockRestore();
  });
});

describe("message: export_bundle", () => {
  test("returns success and reports the number of records", async () => {
    document.body.innerHTML = buildTableHtml();
    const res = await sendMessage({
      message: "export_bundle",
      options: { format: "csv", includeHash: true, allPages: false, deduplicate: true },
    });
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
  });
});
