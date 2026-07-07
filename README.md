# 🥊 UFC Bet Tracker

A premium, privacy-first web application to track, analyze, and manage UFC wagers. The app runs entirely in your browser, with wager data stored locally on your device.


---

## ✨ Features

- **📊 Interactive Dashboard**: View profit/loss, ROI, win/loss records, average odds, **Pending Exposure**, **Unit Size** totals, and event-scoped performance.
- **🥊 UFC Event & Fight Card Tracking**: Manage UFC events, fight cards, matchup ordering, odds, methods, rounds, and active-event views.
- **⚡ Quick Bet Entry**: Add common fight-card bets quickly, including moneylines, props, method/round markets, and parlay legs.
- **🔗 Multi-Leg Parlay Support**: Log parlays with individual legs, match legs to specific events/fights, and calculate parlay odds/returns.
- **📸 OCR Screenshot Import**: Drag-and-drop or upload bet-slip screenshots. OCR is powered by **Tesseract.js** and is currently focused on DraftKings and FanDuel slips.
- **✅ ESPN Validation Preview**: Compare logged bets against ESPN fight results, preview proposed settlement changes, and apply only the updates you choose.
- **📈 Fighter & Bet-Type Analysis**: Break down performance by bet type, fighter, sportsbook, event, and status.
- **💾 Backup / Restore Center**: Create local snapshots, export JSON backups, and import saved tracker data.
- **📝 Obsidian Export**: Generate Markdown summaries and notes for your UFC betting records.
- **🔒 Privacy First**: Built as a static browser app using `localStorage` plus a local `ufc-db.js` data file. No backend database, account, or tracker is required.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+) split between `index.html` and helper modules in `js/`.
- **Data File**: `ufc-db.js` provides embedded tracker data for local/static use.
- **OCR Parsing**: [Tesseract.js](https://tesseract.projectnaptha.com/) (loaded via CDN for scanning screenshots).
- **Charts & UI**: Dynamic CSS variables, SVG icons, and smooth micro-animations.

---

## 🚀 Getting Started

Because this application is serverless, you can run it directly on your computer:
1. Clone or download this repository.
2. Keep `index.html`, `ufc-db.js`, and the `js/` folder together in the same directory.
3. Double-click `index.html` to open it in any modern web browser.

---


## 🔒 Privacy & Security

Under the browser-based architecture:
- Any wagers you enter or import are stored inside your browser's private `localStorage` sandbox.
- When you use the static page, the server serving the HTML cannot read or store your wagers.
- `publish-to-github.ps1` strips private wagers before publishing public files.
