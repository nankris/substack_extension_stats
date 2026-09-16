# Quire — Newsletter Hub

A private, local-first Chrome extension for tracking the newsletters you follow.

Quire helps you manage subscriptions, organize collections, keep a reading list, and review lightweight insights without sending your data anywhere. Everything is stored locally in Chrome using `chrome.storage.local`, and the extension is designed to work without a backend or external analytics.

## Features

- Subscription tracking for your newsletter list
- Collections for grouping newsletters by interest or purpose
- Reading list and favorites to prioritize content
- Simple insight views for a calm overview of reading habits
- Local-first storage with no server dependency
- Works entirely as a browser extension in Chrome

## Privacy-first design

- Data stays on your device in `chrome.storage.local`
- No remote backend or analytics pipeline
- No tracking cookies or external requests required for core functionality
- Can import/export data as JSON or CSV when needed

## Installation

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable Developer mode in the top-right corner.
3. Click Load unpacked.
4. Select the project folder containing this repository.
5. Pin the extension from the Chrome toolbar for easy access.

## Project structure

- `popup/` — quick overview and search
- `dashboard/` — main extension dashboard UI
- `background/` — service worker setup and extension lifecycle logic
- `content/` — Substack page integration for reading visible publication links
- `js/` — shared logic, storage helpers, mock data, and utility modules
- `icons/` — extension icons
- `manifest.json` — Chrome extension manifest

## Live data vs. sample data

Quire includes realistic sample newsletters so the app is immediately usable. If you open Substack pages in Chrome tabs, the extension can optionally sync publication links from those pages and merge them into your subscriptions.

If no matching Substack pages are available, Quire falls back to the existing local sample data instead of breaking the UI.

## License

This project is provided as-is for personal and development use.

## Notes

This repository is designed for Chrome extension development and is best run as an unpacked extension. For a packaged release folder, see the release artifacts in the repository or create a zipped build from the project root.
