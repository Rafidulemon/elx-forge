# ELX Forge

A production-grade Chrome Extension (Manifest V3) for CRO engineers — inject custom
JS & CSS into any website for A/B testing, debugging and prototyping.

## Features

- **Project & Experiment manager** — organize tests per site/domain, enable/disable, duplicate, import/export
- **Monaco-powered code editor** — JS + CSS with syntax highlighting, formatting, auto-save
- **Live injection** — run any experiment immediately on the active page, or let URL rules auto-inject on matching pages
- **Element picker** — click any element to generate a CSS selector / XPath and drop a snippet into the editor
- **Console panel** — captures `console.log`, page errors and injection events streamed from the injected page in real time
- **Popup quick-run** — see which experiments match the current page and run them from the toolbar
- **Background badge** — shows the number of matching experiments for the active tab
- **Light & dark themes** — with a CSS-variable design system

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript 5 |
| UI | React 19, React Router (HashRouter), Zustand |
| Code editor | Monaco Editor (lazy-loaded, web workers) |
| Styling | Tailwind CSS 3 + CSS variables |
| Build | Vite 6 (dual builds: UI + IIFE scripts) |
| Extension | Chrome Manifest V3, Service Worker |
| Storage | `chrome.storage.local` (generic typed storage service) |
| Messaging | `runtime.sendMessage` RPCs, long-lived ports (console relay), `window.postMessage` bridge |
| Injection | `chrome.userScripts` (CSP-exempt USER_SCRIPT world) with `scripting.executeScript` fallback + `<style>` injection |
| Linting / Format | ESLint, Prettier |
| Icons | Custom PNG icon + logo (`public/icons/icon.png`, `public/icons/logo.png`) |

## Project Structure

```
├── public/
│   ├── manifest.json          # MV3 manifest
│   └── icons/                 # extension icon (icon.png) + UI logo (logo.png)
├── scripts/
│   └── build-scripts.mjs      # builds background/content/injected as IIFE
├── src/
│   ├── shared/                # types, constants, storage services, utils, helpers
│   ├── injected/              # MAIN-world bridge script (console patch + window.ELX)
│   ├── content/               # content script: bridge, injection engine, picker, url watcher
│   ├── background/            # service worker: message router, console relay, badge
│   └── ui/                    # React app (Studio) + popup
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Chrome 135+ (required for full CSP support via the `chrome.userScripts` API)

### Install & Build

```bash
npm install
npm run build        # builds both the UI and the extension scripts into dist/
```

Other scripts:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm run watch:ui     # rebuild UI on changes
```

## Chrome Setup Guide

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** (top-right corner).
3. Click **Load unpacked** and select the `dist` folder of this repository.
4. Pin the **ELX Forge** icon from the puzzle icon menu.

### Quick test

1. Open a website (e.g. `https://example.com`) in its own tab.
2. Click the extension icon → **Open ELX Forge**.
3. Create a project (name + domain) → open it → **New Experiment**.
4. Add JS (e.g. `console.log("Testing ELX Forge")`) and/or CSS (e.g. `body { background: lightyellow; }`).
5. Click **Run** — the active page (or the most recently used webpage tab) gets the changes immediately.
6. Switch to the editor's **Console** tab to see `bridge:ready`, `js:inject`, `css:inject` events and your `console.log` output.

### URL-rule auto-injection

1. In an experiment, open the **URL Rules** tab.
2. Add a rule (`Starts with`, `Contains`, `Regex`, `Wildcard`, …) matching the target page and click **Test**.
3. Reload the target page — ELX Forge auto-injects the experiment and the toolbar badge shows the match count.

### Notes

- User JS runs in a **USER_SCRIPT world** (via `chrome.userScripts`) that is exempt from the page's CSP — so it works even on strict-CSP sites that block `unsafe-eval` and TrustedTypes. Older Chrome versions fall back to `chrome.scripting.executeScript` (MAIN world), which works unless the page blocks `unsafe-eval`.
- The bridge exposes `window.ELX` helpers to user scripts (see `src/shared/helpers`).
- Console streaming only works on `http(s)` pages where the extension's content script runs.

### Enabling the user scripts API (Chrome 135+)

The `chrome.userScripts` API powers injection on strict-CSP sites and requires a one-time toggle:

1. Open `chrome://extensions` and click **Details** on the ELX Forge card.
2. Toggle on **Allow User Scripts**.
   - On Chrome older than 138, the extension instead requires **Developer mode** to be enabled (top-right of `chrome://extensions`).
3. Reload the extension if the toggle was turned on while the service worker was already running.
