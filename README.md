# ELX Forge

A production-grade Chrome Extension (Manifest V3) for CRO engineers — inject custom
JS & CSS/SCSS into any website for A/B testing, debugging and prototyping.

Built by [Echologyx](https://www.echologyx.com).

## Features

- **Project & Experiment manager** — organize tests per site/domain, enable/disable, duplicate, import/export
- **Monaco-powered code editor** — `index.js` + `style.css` / `style.scss` with syntax highlighting, formatting, auto-save, per-file copy, and VS Code-style snippets
- **Domain-based auto-injection** — enabling an experiment runs it on the project's URL; disabling it stops it
- **Runs on the project URL** — clicking **Run** injects into the project's domain (opens the tab if needed) and enables the experiment
- **Starter templates** — every new experiment ships with a `waitForElem` JS boilerplate and an orange/black SCSS banner (SCSS is the default style mode)
- **Snippet system** — `clg`, `qs`, `ife`, `fori`, `wait`, `df`, `mq`, and more for JS/CSS/SCSS, with Tab-placeholder navigation
- **Element picker** — click any element to generate a CSS selector / XPath and drop a snippet into the editor
- **Console panel** — captures `console.log`, page errors and injection events streamed from the injected page in real time
- **Popup quick-run** — the extension popup lists every project targeting the current site with all its experiments; toggle experiments and the project on/off, run, and reload the page from the popup
- **Background badge** — shows the number of active experiments for the active tab
- **Orange & black theme** — with a CSS-variable design system

## Key Behaviors

- **Enable = run, disable = stop.** Flipping an experiment's toggle on injects it on the project's URL immediately; flipping it off removes its CSS and stops auto-injection.
- **Run enables.** Clicking **Run** also turns the experiment's enable toggle on.
- **Tests target the project URL.** Runs (and the element picker) use the domain set when the project was created, not the currently active tab.
- **Deactivating a project disables its experiments.** Reactivating the project leaves them off — each must be manually re-enabled.
- **SCSS is the default style editor.** Each experiment can be authored as `style.css` or `style.scss` via the CSS/SCSS toggle in the editor toolbar.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript 5 |
| UI | React 19, React Router (HashRouter), Zustand |
| Code editor | Monaco Editor (lazy-loaded, web workers, custom snippet providers) |
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
│   ├── shared/                # types, constants (incl. starter templates), storage services, utils
│   ├── injected/              # MAIN-world bridge script (console patch + window.ELX)
│   ├── content/               # content script: bridge, injection engine, picker, url watcher
│   ├── background/            # service worker: message router, console relay, badge
│   └── ui/
│       ├── editor/            # Monaco wrapper + snippet system (registerSnippets.ts, snippets/)
│       ├── components/        # layout, panels, UI primitives
│       ├── pages/             # Dashboard, Project, Experiment editor, Console, Settings
│       ├── store/             # zustand stores synced with chrome.storage
│       └── popup.tsx          # toolbar popup (site projects, toggles, run/refresh)
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
3. Create a project with the site's domain → open it → **New Experiment**.
4. The JS editor ships with the `waitForElem` starter and the style editor with the SCSS banner.
5. Click **Run** — the project's URL tab opens/activates and gets the changes; the experiment is enabled automatically.
6. Switch to the editor's **Console** tab to see `bridge:ready`, `js:inject`, `css:inject` events and your `console.log` output.

### Enable / disable from the popup

1. On the site's page, click the extension icon — every project targeting that domain is listed with all of its experiments.
2. Toggle an experiment **on** to run it on the project's URL, or **off** to stop it.
3. Use the refresh button to reload the project's page after toggling.
4. Deactivating the project's own toggle disables all of its experiments at once.

### Auto-injection

An experiment runs automatically on any page belonging to its project's domain while
it is **enabled** and its project is **active**. No URL rules are required — the domain
set at project creation is the trigger. URL rules are still available for testing
specific pages from the experiment's **URL Rules** tab.

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
