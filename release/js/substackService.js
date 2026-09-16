// This service never asks for a password and never sends anything off the device.
// It only asks the content script (running inside tabs the user already has open on
// substack.com, in their own logged-in session) to read what is visibly on the page.
// If no matching tabs are open, or the page markup doesn't match what we look for,
// we say so plainly and the UI keeps working from local/mock data.

import { generateId } from "./utils.js";

const SUBSTACK_URL_PATTERNS = ["https://substack.com/*", "https://*.substack.com/*"];
const SCRAPE_TIMEOUT_MS = 4000;

function queryTabs() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      resolve([]);
      return;
    }
    chrome.tabs.query({ url: SUBSTACK_URL_PATTERNS }, (tabs) => resolve(tabs || []));
  });
}

function requestScrapeFromTab(tabId) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, SCRAPE_TIMEOUT_MS);

    try {
      chrome.tabs.sendMessage(tabId, { type: "QUIRE_REQUEST_SCRAPE" }, (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (chrome.runtime.lastError || !response) {
          resolve(null);
          return;
        }
        resolve(response);
      });
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`.toLowerCase();
  } catch {
    return url;
  }
}

// Merges scraped newsletters into the existing subscriptions list, deduplicating by
// publication URL. Existing user edits (favorite, collection, status) are preserved.
export function mergeScrapedIntoSubscriptions(existingSubs, scraped) {
  const byUrl = new Map(existingSubs.map((s) => [normalizeUrl(s.url), s]));
  let added = 0;

  for (const item of scraped) {
    const key = normalizeUrl(item.url);
    if (!key) continue;
    if (byUrl.has(key)) {
      // Refresh a couple of soft fields, keep the user's own edits intact.
      const existing = byUrl.get(key);
      existing.lastSeenLive = new Date().toISOString();
      continue;
    }
    byUrl.set(key, {
      id: generateId("sub"),
      name: item.name || "Untitled newsletter",
      author: item.author || "",
      url: item.url,
      description: item.description || "",
      category: item.category || "Uncategorized",
      status: item.status || "free",
      favorite: false,
      tags: [],
      collection: null,
      lastActivity: new Date().toISOString(),
      subscriptionDate: new Date().toISOString(),
      source: "live",
    });
    added += 1;
  }

  return { subscriptions: Array.from(byUrl.values()), added };
}

// Attempts a best-effort live sync. Always resolves — never throws — so callers can
// treat "no live data available" as a normal, expected outcome rather than an error.
export async function attemptLiveSync() {
  const tabs = await queryTabs();
  if (!tabs.length) {
    return { ok: false, reason: "no_substack_tabs", scraped: [] };
  }

  const results = await Promise.all(tabs.map((t) => requestScrapeFromTab(t.id)));
  const scraped = [];
  for (const r of results) {
    if (r && Array.isArray(r.newsletters)) {
      scraped.push(...r.newsletters);
    }
  }

  if (!scraped.length) {
    return { ok: false, reason: "no_data_found", scraped: [] };
  }

  return { ok: true, reason: "ok", scraped };
}
