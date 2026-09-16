# Quire — Newsletter Hub

A private, local-first Chrome extension for organizing the Substack newsletters you follow:
subscriptions, collections, a reading list, and lightweight insights — all stored on your
own device with `chrome.storage.local`. Built with plain HTML/CSS/JS on Manifest V3, no
frameworks, no backend, no analytics.

## Install (unpacked, for testing or personal use)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder (`newsletter-hub/`).
4. Pin Quire from the extensions toolbar icon for quick access.

## What's inside

- **Popup** (`popup/`) — subscription counts, quick search, recent newsletters, and a
  button to open the full dashboard.
- **Dashboard** (`dashboard/`) — full app: Dashboard, Subscriptions, Collections, Reading
  List, Favorites, Insights, Settings. Opens as a normal extension tab.
- **Background** (`background/background.js`) — Manifest V3 service worker; seeds sample
  data on first install and opens the dashboard from the popup.
- **Content script** (`content/content.js`) — runs only on substack.com pages you already
  have open, and only when asked, to read publicly-rendered publication links from the
  page. It never reads credentials, cookies, or form data, and sends nothing off-device.
- **`js/`** — shared modules: `storage.js` (schema + chrome.storage.local wrapper),
  `mockData.js` (fallback sample data), `substackService.js` (live-sync orchestration),
  `utils.js`, `theme.js`, and `tokens.css` (shared design tokens).

## Real data vs. sample data

Quire ships with ~20 realistic sample newsletters so every view works immediately. To try
live retrieval:

1. Open one or more substack.com pages in other tabs (e.g. your inbox or a publication).
2. In Quire, go to **Settings → Substack data → Sync from open Substack tabs**.
3. Quire asks the content script on each open Substack tab to read the publication links
   already visible on the page and merges anything new into your subscriptions.

If no Substack tabs are open, or the page doesn't expose recognizable links, Quire says so
and keeps using your existing/sample data — the UI never breaks or blanks out.

## Data & privacy

- Everything lives in `chrome.storage.local` on your device.
- No external servers, no analytics, no tracking.
- Export/import as JSON any time from Settings; subscriptions can also be exported as CSV.
- Not affiliated with Substack Inc. No Substack branding, colors, or logos are used.
