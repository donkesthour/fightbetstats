# 🥊 UFC Bet Tracker

A beautiful, premium, privacy-first web application to track, analyze, and manage your UFC wagers. This app runs entirely in your browser, saving all data locally to ensure complete privacy.


---

## ✨ Features

- **📸 OCR Screenshot Import**: Drag-and-drop or upload screenshots of your bet slips (Currently only supported for DraftKings and FanDuel). The embedded **Tesseract.js** OCR engine scans the image and automatically fills out matchup, selection, odds, book, wager, and payout details.
- **📊 Interactive Dashboard**: View real-time statistics including total profit/loss, ROI (Return on Investment), win/loss records, average odds, and custom charts.
- **🔗 Multi-Leg Parlay Support**: Easily log complex parlays with individual legs, matching each leg to specific events/fights.
- **🔒 Privacy First**: Built using static HTML5 and browser-based `localStorage`. Your bets never leave your device, requiring no backend databases, user registrations, or trackers.
- **💾 Data Portability**: Export your entire database of wagers as a `.json` backup file or import existing data with a single click.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+).
- **OCR Parsing**: [Tesseract.js](https://tesseract.projectnaptha.com/) (loaded via CDN for scanning screenshots).
- **Charts & UI**: Dynamic CSS variables, SVG icons, and smooth micro-animations.

---

## 🚀 Getting Started

### 1. Run Locally
Because this application is serverless, you can run it directly on your computer:
1. Clone or download this repository.
2. Double-click `index.html` to open it in any web browser.

### 2. Deploying to GitHub Pages
To host your own version publicly:
1. Initialize a Git repository in this folder.
2. Push the files to your GitHub account.
3. In your GitHub repository settings, navigate to **Pages**.
4. Set the Source to **Deploy from a branch** and select `main` (root) as the branch.
5. Your dashboard will be live at `https://<your-username>.github.io/<your-repo-name>/`.

---


## 🔒 Privacy & Security

Under the browser-based architecture:
- Any wagers you enter or import are stored inside your browser's private `localStorage` sandbox.
- When you use the static page, the server serving the HTML cannot read or store your wagers.
- Your personal bet data is never committed to Git or pushed to public repositories.
