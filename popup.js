// Popup script for DO Audit Log Scraper v2.2 — Manifest V3

document.addEventListener("DOMContentLoaded", async () => {
  const scrapeButton = document.getElementById("scrapeButton");
  const scrapeAllButton = document.getElementById("scrapeAllButton");
  const copyButton = document.getElementById("copyButton");
  const filteredButton = document.getElementById("filteredButton");
  const bundleButton = document.getElementById("bundleButton");
  const messageDiv = document.getElementById("message");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const statsDiv = document.getElementById("stats");
  const monitorToggle = document.getElementById("monitorToggle");
  const monitorStatus = document.getElementById("monitorStatus");
  const scheduleToggle = document.getElementById("scheduleToggle");
  const scheduleInterval = document.getElementById("scheduleInterval");
  const scheduleStatus = document.getElementById("scheduleStatus");

  // ─── Load saved options from storage ──────────────────────────────────
  try {
    const stored = await chrome.storage.local.get(["exportOptions", "scheduleConfig"]);
    const opts = stored.exportOptions;
    if (opts) {
      if (opts.format) {
        const radio = document.querySelector(
          `input[name="format"][value="${opts.format}"]`
        );
        if (radio) radio.checked = true;
      }
      if (opts.includeMetadata !== undefined)
        document.getElementById("includeMetadata").checked = opts.includeMetadata;
      if (opts.includeHash !== undefined)
        document.getElementById("includeHash").checked = opts.includeHash;
      if (opts.timestampFilename !== undefined)
        document.getElementById("timestampFilename").checked = opts.timestampFilename;
      if (opts.deduplicate !== undefined)
        document.getElementById("deduplicate").checked = opts.deduplicate;
    }
    const sched = stored.scheduleConfig;
    if (sched) {
      scheduleToggle.checked = !!sched.enabled;
      if (sched.intervalMinutes) scheduleInterval.value = sched.intervalMinutes;
    }
  } catch (err) {
    console.log("Could not load stored options:", err);
  }

  // ─── Page status check ────────────────────────────────────────────────
  let currentTabId = null;
  let isOnCorrectPage = false;

  async function checkPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    currentTabId = tab.id;
    isOnCorrectPage = tab.url.includes("cloud.digitalocean.com/account/security");

    if (isOnCorrectPage) {
      statusDot.className = "status-dot active";
      statusText.textContent = "Ready to scrape";
      scrapeButton.disabled = false;
      scrapeAllButton.disabled = false;
      copyButton.disabled = false;
      filteredButton.disabled = false;
      bundleButton.disabled = false;

      try {
        const result = await chrome.tabs.sendMessage(tab.id, { message: "get_stats" });
        if (result && result.rowCount !== undefined) {
          statsDiv.textContent = `Found ${result.rowCount} audit log entries on current page`;
          if (result.hasNextPage) {
            statsDiv.textContent += " (more pages available)";
          }
        }
      } catch {
        console.log("Content script not ready yet");
      }
    } else {
      statusDot.className = "status-dot inactive";
      statusText.textContent = "Navigate to DigitalOcean Security page";
      scrapeButton.disabled = true;
      scrapeAllButton.disabled = true;
      copyButton.disabled = true;
      filteredButton.disabled = true;
      bundleButton.disabled = true;
      showMessage("Please open the DigitalOcean Security page first", "warning");
    }
  }

  await checkPage();

  // ─── Helper: collect current options ─────────────────────────────────
  function getOptions() {
    return {
      format: document.querySelector('input[name="format"]:checked').value,
      includeMetadata: document.getElementById("includeMetadata").checked,
      includeHash: document.getElementById("includeHash").checked,
      timestampFilename: document.getElementById("timestampFilename").checked,
      deduplicate: document.getElementById("deduplicate").checked,
    };
  }

  // ─── Save options to storage on change ─────────────────────────────────
  async function saveOptions() {
    const options = getOptions();
    await chrome.storage.local.set({ exportOptions: options });
  }

  document
    .querySelectorAll('input[name="format"]')
    .forEach((radio) => radio.addEventListener("change", saveOptions));
  ["includeMetadata", "includeHash", "timestampFilename", "deduplicate"].forEach((id) =>
    document.getElementById(id).addEventListener("change", saveOptions)
  );

  // ─── Get text filters ────────────────────────────────────────────────
  function getFilters() {
    return {
      User: document.getElementById("filterUser").value.trim(),
      Action: document.getElementById("filterAction").value.trim(),
      "IP Address": document.getElementById("filterIP").value.trim(),
    };
  }

  // ─── Get date-range filter (or null) ─────────────────────────────────
  function getDateRange() {
    const from = document.getElementById("filterFrom").value;
    const to = document.getElementById("filterTo").value;
    if (!from && !to) return null;
    return { from: from || undefined, to: to || undefined };
  }

  function hasActiveFilters() {
    const filters = getFilters();
    return Object.values(filters).some((v) => v.length > 0) || Boolean(getDateRange());
  }

  // ─── Scrape current page ──────────────────────────────────────────────
  scrapeButton.addEventListener("click", async () => {
    if (!currentTabId) return;
    try {
      const response = await chrome.tabs.sendMessage(currentTabId, {
        message: "scrape_data",
        options: { ...getOptions(), allPages: false },
      });
      if (response && response.success) {
        showMessage(`Scraped ${response.count} audit log entries!`, "success");
      } else {
        showMessage("Failed to scrape data. Check the console.", "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
    }
  });

  // ─── Scrape all pages ─────────────────────────────────────────────────
  scrapeAllButton.addEventListener("click", async () => {
    if (!currentTabId) return;
    showMessage("Scraping all pages… This may take a moment.", "info");
    try {
      const response = await chrome.tabs.sendMessage(currentTabId, {
        message: "scrape_data",
        options: { ...getOptions(), allPages: true },
      });
      if (response && response.success) {
        showMessage(
          `Scraped ${response.count} entries from ${response.pages} page(s)!`,
          "success"
        );
      } else {
        showMessage("Failed to scrape all pages.", "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
    }
  });

  // ─── Copy to clipboard ────────────────────────────────────────────────
  copyButton.addEventListener("click", async () => {
    if (!currentTabId) return;
    try {
      const response = await chrome.tabs.sendMessage(currentTabId, {
        message: "copy_data",
      });
      if (response && response.success) {
        showMessage(`Copied ${response.count} entries to clipboard!`, "success");
      } else {
        showMessage("Failed to copy.", "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
    }
  });

  // ─── Export filtered ───────────────────────────────────────────────────
  filteredButton.addEventListener("click", async () => {
    if (!currentTabId) return;
    const filters = getFilters();
    const dateRange = getDateRange();
    if (!hasActiveFilters()) {
      showMessage("Set at least one filter first.", "warning");
      return;
    }
    try {
      const response = await chrome.tabs.sendMessage(currentTabId, {
        message: "filter_data",
        filters,
        dateRange,
      });
      if (response && response.success) {
        // Download the filtered CSV
        const options = getOptions();
        const filename = `do_audit_logs_filtered.${options.format}`;
        const blob = new Blob([response.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage(`Exported ${response.count} filtered entries!`, "success");
      } else {
        showMessage("Failed to filter data.", "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
    }
  });

  // ─── Export evidence bundle (.zip) ─────────────────────────────────────
  bundleButton.addEventListener("click", async () => {
    if (!currentTabId) return;
    showMessage("Building evidence bundle…", "info");
    try {
      const response = await chrome.tabs.sendMessage(currentTabId, {
        message: "export_bundle",
        options: { ...getOptions(), allPages: false },
      });
      if (response && response.success) {
        showMessage(
          `Evidence bundle exported: ${response.count} entries from ${response.pages} page(s).`,
          "success"
        );
      } else {
        showMessage(
          "Failed to build bundle. " + (response && response.error ? response.error : ""),
          "error"
        );
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
    }
  });

  // ─── Automated scheduling ─────────────────────────────────────────────
  function currentSchedule() {
    const minutes = Math.min(
      Math.max(parseInt(scheduleInterval.value, 10) || 60, 1),
      10080
    );
    scheduleInterval.value = String(minutes);
    return {
      enabled: scheduleToggle.checked,
      intervalMinutes: minutes,
      ...getOptions(),
    };
  }

  async function saveSchedule() {
    const cfg = currentSchedule();
    await chrome.storage.local.set({ scheduleConfig: cfg });
    if (currentTabId) {
      try {
        await chrome.tabs.sendMessage(currentTabId, { message: "update_schedule" });
      } catch {
        // Content script may not be present — storage.onChanged will re-apply later.
      }
    }
    scheduleStatus.textContent = cfg.enabled
      ? `Scheduled: every ${cfg.intervalMinutes} min`
      : "";
  }

  scheduleToggle.addEventListener("change", saveSchedule);
  scheduleInterval.addEventListener("change", saveSchedule);

  // ─── Real-time monitoring toggle ──────────────────────────────────────
  monitorToggle.addEventListener("change", async () => {
    if (!currentTabId) return;
    const enabled = monitorToggle.checked;
    try {
      await chrome.tabs.sendMessage(currentTabId, {
        message: enabled ? "start_monitoring" : "stop_monitoring",
      });
      if (enabled) {
        statusDot.className = "status-dot monitoring";
        monitorStatus.textContent = "Monitoring for new entries…";
      } else {
        statusDot.className = "status-dot active";
        monitorStatus.textContent = "";
      }
    } catch {
      showMessage("Could not toggle monitoring.", "error");
    }
  });

  // ─── Listen for new-entry notifications from background ───────────────
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "newEntriesNotification") {
      showMessage(`${request.count} new audit log entry detected!`, "info");
    }
  });

  // ─── Message display ──────────────────────────────────────────────────
  let messageTimeout = null;

  function showMessage(text, type = "info") {
    if (messageTimeout) clearTimeout(messageTimeout);
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = "block";
    if (type !== "error") {
      messageTimeout = setTimeout(() => {
        messageDiv.style.display = "none";
      }, 5000);
    }
  }
});
