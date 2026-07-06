# Recon Pulse 📡

[![React](https://img.shields.io/badge/React-18-blue.svg?logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-blue.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue?logo=sqlite&logoColor=white)](https://sqlite.org)

Recon Pulse is a lightweight, real-time website intelligence scanner designed for analysts and developers to discover technical frameworks, headers, security posture, performance metrics, sitemaps, redirect chains, Wayback archive history, social presence, and tracking scripts instantly.

**Live Demo URL:** [https://recon-pulse-1.onrender.com](https://recon-pulse-1.onrender.com)
**Live Backend API URL:** [https://recon-pulse.onrender.com](https://recon-pulse.onrender.com)

---

## 🏗️ Architecture Overview

```text
User → React Frontend (Vite 5) → FastAPI Backend (Python) → 12+ External APIs
                                       ↓
                                SQLite Cache (24hr)
                                       ↓
                                SSE Stream → Frontend Bento Cards
```

---

## ⚡ Full Feature List & Capabilities

### 📡 Active Discovery Services
- **Redirect Chain Tracker**: Recursively follows HTTP redirection paths up to 10 hops, identifying status codes (e.g. 301, 302, 200) and headers.
- **Email Security DNS Auditor**: Validates SPF, DMARC, and DKIM TXT configuration records to identify potential spoofing vulnerabilities.
- **Social Media Scanner**: Resolves profile status on major social platforms (Twitter/X, LinkedIn, GitHub, Instagram, Facebook, YouTube) for brand footprint mapping.
- **Technology stack & Tracker Inventory**: Identifies front-end frameworks, analytics tools (Google Analytics, Mixpanel), pixels (Facebook, TikTok), support chats, and Google Fonts.
- **Wayback Machine Integration**: Recovers archive age metrics to estimate domain registration longevity.
- **HTTP Version Audit**: Analyzes socket negotiations and Alt-Svc headers to report HTTP/2 and HTTP/3 support.
- **Robots.txt & Sitemap fetcher**: Analyzes indexing instructions and maps sitemap structures.
- **Friendly Hosting Geolocation**: Resolves origin server IP, ISP provider names (Amazon AWS, Google Cloud, Cloudflare, etc.), and country locations.

### 🎨 Frontend Usability
- **EventSource (SSE) Streaming**: Delivers scan metrics in real-time as background tasks complete.
- **Keyboard-Driven Shortcuts**: Complete keyboard-centric workflow (Ctrl+K search, Enter scan, Esc reset, Ctrl+E export, Ctrl+S share).
- **Responsive Theme Toggles**: Clean, modern dark/light themes saved to browser storage.
- **One-click Color Swatch Copies**: Extract dominate screenshot palettes and copy HEX codes with visual copy indicators.
- **Local History Persistence**: Saves the last 10 scan sessions to localStorage for instant re-scans.
- **Compare Mode**: Side-by-side URL scans with highlighted category winners.

---

## 📡 Data Sources & APIs Referenced
1. **RDAP Domain Info**: `https://rdap.org` (No key required)
2. **Geolocation Services**: `http://ip-api.com` (No key required)
3. **DNS resolver**: Cloudflare DoH `https://cloudflare-dns.com` (No key required)
4. **SSL / HTTP Headers**: Local TLS verification via Python `ssl` and `socket`
5. **Google PageSpeed**: Google API Console `https://pagespeedonline.googleapis.com` (API Key required)
6. **GNews Mentions**: `https://gnews.io` (API Key required)
7. **GitHub Profile Info**: GitHub API `https://api.github.com` (Auth Token optional)
8. **Carbon Impact**: `https://api.websitecarbon.com` (No key required)
9. **Tranco Rank**: Weekly CSV from `https://tranco-list.eu` (No key required)
10. **Wayback Machine**: Internet Archive `https://archive.org` (No key required)
11. **Sitemaps/Robots**: Direct fetching from destination root paths.

---

## 🛠️ Local Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+

### Step 1: Clone the Repository
```bash
git clone https://github.com/AneequeShahid/recon-pulse.git
cd recon-pulse
```

### Step 2: Configure & Start FastAPI Backend
1. Go to the backend folder:
   ```bash
   cd backend
   ```
2. Create and active virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up `.env` file:
   ```env
   PAGESPEED_API_KEY=your_google_pagespeed_key
   GNEWS_API_KEY=your_gnews_key
   GITHUB_API_KEY=your_github_token
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Step 3: Run Backend Service Tests
```bash
python -m pytest tests
```

### Step 4: Configure & Start React Frontend
1. Go to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run Vite server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`.

---

## 📸 Screenshots
*(Screenshots will be added shortly)*
