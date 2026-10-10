# VEX IQ Level Up - Score Calculator & Match Timer 🤖⏱️

A modern, responsive web application for the **2026–2027 VEX IQ Robotics Competition: Level Up** (Game Manual v1.1). Built with React, Vite, and Tailwind CSS, ready for 1-click deployment on **Vercel**.

---

## 🌟 Features

### 1. 🧮 Dual-Mode Official Score Calculator
- **Detailed Goal-Split Mode (Recommended)**:
  - Separate score counters for **Red Pyramid & Floor** (L1: 3 pts, L2: 6 pts, L3: 12 pts, Floor: 1 pt)
  - Separate score counters for **Blue Pyramid & Floor** (L1: 3 pts, L2: 6 pts, L3: 12 pts, Floor: 1 pt)
  - **L4 Top Goal** strictly enforces **Yellow Bean Bags only** (16 pts each, max 6)
  - Multi-goal Yellow Bag distribution (Yellow bags can score on any goal)
  - Live Bean Bag inventory quotas (16 Red, 16 Blue, 6 Yellow, 38 Total) with visual capacity warnings
- **Quick Levels Mode**:
  - Compact level-by-level tally (Floor, L1, L2, L3, L4) for rapid tournament scoring

### 2. ⏱️ Tournament Match Video Timer
- Integrated with the official tournament manager video (`timer.mp4`) with authentic sound cues (countdown, starting buzzer, switch driver sound, endgame warning, and final buzzer)
- **Driver Switch Alert**: Visual banner and pulse during the 35s–25s controller hand-off window (`<GG11>`)
- **Skills Stop Time Recorder**: 1-click capture of remaining seconds (`<RSC8>`) directly transferred to the calculator for tiebreakers
- Fullscreen scoreboard mode for projecting onto external monitors or TVs at practice scrimmages

### 3. 📊 Match History & Progress Analytics
- Saves runs to browser `localStorage`
- **Categorization**:
  - Match Types: *Teamwork Challenge*, *Driving Skills*, *Autonomous Coding Skills*
  - Session Tags: *Practicing*, *Testing*, *Fixing Bugs / Tuning*, *Robot Building*, *Official Competition*, *Scrimmage*
- **Sorting & Filtering**: Filter by date, match type, activity tag, and sort by highest score or newest
- **Edit & Adjust**: Edit match notes, session tags, or team labels after saving
- **Load into Calculator**: Restore any past run configuration back into the calculator with 1 click
- **Export & Backup**: Export match history to JSON and import backup files

---

## 🚀 How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## ☁️ Deploying to Vercel

### Method 1: Deploy with Vercel CLI
```bash
# In the project directory:
npx vercel
```

### Method 2: Deploy via GitHub / Vercel Dashboard
1. Initialize git and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of VEX IQ Level Up Calculator & Timer"
   # Push to your GitHub repo
   ```
2. Go to [vercel.com](https://vercel.com) -> **Add New Project** -> Import your GitHub repository.
3. Framework Preset: **Vite** (already preconfigured in `vercel.json`).
4. Click **Deploy**!

---

## 📋 VEX IQ Level Up (v1.1) Scoring Summary

| Scoring Element | Point Value | Rules & Conditions |
|---|---|---|
| **L4 Goal** | **16 Points** | **Yellow Bean Bags ONLY** (Max 6) `<SC5>` |
| **L3 Goal** | **12 Points** | Supported on 3rd pyramid level `<SC4>` |
| **L2 Goal** | **6 Points** | Supported on 2nd pyramid level `<SC4>` |
| **L1 Goal** | **3 Points** | Supported on 1st pyramid level `<SC4>` |
| **Floor Goal**| **1 Point** | Inside colored floor perimeter `<SC3>` |

- **Total Objects**: 38 Bean Bags (16 Red, 16 Blue, 6 Yellow)
- **Theoretical Maximum Score**: 480 Points (6 Yellow on L4 + 32 Red/Blue on L3)
