# RECON PULSE

[![Live Demo](https://img.shields.io/badge/Live%20Demo-recon--pulse-blue)](https://recon-pulse-1.onrender.com)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-green)](https://recon-pulse.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> Drop any URL. Get complete website intelligence in 30 seconds.

**[→ Try Live Demo](https://recon-pulse-1.onrender.com)**

---

## What is Recon Pulse?

Recon Pulse replaces 10 different tools with one dashboard. Paste any domain
and get a full intelligence report: tech stack, security grade, threat intel,
performance metrics, hosting info, email security, social presence, trackers,
redirect chain, DNS records, and more — all streaming in real time.

## Features

| Feature | Data Source |
|---|---|
| Website Screenshot | Microlink (free) |
| Tech Stack Detection | Custom fingerprinter |
| Security Grade | Python ssl module |
| Performance Score | Google PageSpeed API |
| Threat Intelligence | VirusTotal + AlienVault OTX + Shodan |
| Hosting & ASN | ip-api.com (free) |
| Domain Info | RDAP Protocol (free) |
| DNS Records | Google DNS over HTTPS (free) |
| Email Security | Google DNS (SPF/DMARC/DKIM) |
| Social Presence | HEAD requests (no API) |
| Redirect Chain | httpx (no API) |
| Tracker Inventory | HTML fingerprinting |
| Font Detection | Google Fonts regex |
| Website Age | Wayback Machine API (free) |
| HTTP Version | httpx http2 (no API) |
| Robots.txt | Direct fetch (no API) |
| Carbon Footprint | Website Carbon API (free) |
| Traffic Rank | Tranco List (free) |
| News Mentions | GNews API (free) |
| Color Palette | Canvas API (client side) |

## Architecture

```
User Input
    ↓
React Frontend (Vite 5 + Tailwind)
    ↓
FastAPI Backend
    ↓
asyncio.gather() → 18 parallel services
    ↓
Supabase (report cache, 24hr TTL)
    ↓
SSE Stream → Frontend cards fade in progressively
```

## Stack

- **Frontend:** React 19, Vite 5, Tailwind CSS 3, react-router-dom
- **Backend:** FastAPI, httpx, asyncio, Pydantic
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Render.com (free tier)
- **APIs:** 12 free APIs, zero paid dependencies

## Local Setup

```bash
# Backend
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env    # Fill in your free API keys
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

## Free API Keys Required

| Key | Where to get |
|---|---|
| PAGESPEED_API_KEY | console.cloud.google.com |
| GITHUB_API_KEY | github.com/settings/tokens |
| GNEWS_API_KEY | gnews.io |
| VIRUSTOTAL_API_KEY | virustotal.com |
| ALIENVAULT_OTX_KEY | otx.alienvault.com |
| SHODAN_API_KEY | shodan.io |
| SUPABASE_URL + KEY | supabase.com |

Built by [Aneeque Shahid](https://github.com/ANEEQUESHAHID)
