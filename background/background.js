import { ensureInitialized } from "../js/storage.js";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureInitialized();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureInitialized();
});

// Lets the popup open the full dashboard as an extension tab.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "QUIRE_OPEN_DASHBOARD") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
