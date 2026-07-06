# Recon Pulse 📡

<p align="center">
  <strong>Live Website Intelligence & Reconnaissance Dashboard</strong><br>
  An elegant, real-time web scanner presenting progressive, side-by-side technical reconnaissance data in a premium Bento grid.
</p>

<p align="center">
  <a href="https://recon-pulse-1.onrender.com"><img src="https://img.shields.io/badge/Live_Demo-https%3A%2F%2Frecon--pulse--1.onrender.com-blueviolet?style=for-the-badge" alt="Live Demo"></a>
  <a href="https://recon-pulse.onrender.com"><img src="https://img.shields.io/badge/API_Endpoint-https%3A%2F%2Frecon--pulse.onrender.com-blue?style=for-the-badge" alt="API Endpoint"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue.svg?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-green.svg?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-blue.svg?logo=tailwindcss&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/Vite-5-646CFF.svg?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Supabase-Supported-3ECF8E?logo=supabase&logoColor=white" alt="Supabase">
</p>

---

## 🏗️ System Architecture

Recon Pulse uses a decoupled client-server architecture built for minimal latency, progressive data streaming, and intelligent local caching.

```text
                                  +---------------------------------------+
                                  |            React Frontend             |
                                  |           (Vite 5 + TS)               |
                                  +---------------------------------------+
                                    |                 ^                 ^
                     1. POST /scan  |                 | 3. SSE Stream   | 2. Debounced
                                    v                 | (EventSource)   |    Prefetch
                                  +---------------------------------------+
                                  |            FastAPI Backend            |
                                  +---------------------------------------+
                                    |                 |
                   4. Cache Lookup  |                 | 5. Concurrent Gather
                    (24-Hour TTL)   v                 v (Custom Task Timeouts)
                          +---------------+   +---------------------------------+
                          |  SQLite DB    |   | 12+ Scanner Services:           |
                          |  Local Cache  |   | - DNS Resolvers  - Geo IP       |
                          +---------------+   | - SSL Headers    - PageSpeed    |
                                              | - Wayback Archive- Puppeteer    |
                                              | - Email Security - Trackers     |
                                              +---------------------------------+
```

---

## 📡 Core Discovery Features

Recon Pulse conducts comprehensive multi-threaded scans of any target domain, resolving data across 12+ channels:

*   **HTTP Redirect Chain**: Recursively follows redirects up to 10 hops, recording the URL, status code (e.g. 301, 302, 200), and redirection location headers.
*   **Email Spoofing Security**: Queries Google DoH to verify domain SPF, DMARC, and DKIM DNS configuration records.
*   **Robots.txt & Sitemap Discovery**: Parses root `/robots.txt` files and checks default or declared `/sitemap.xml` paths to map search visibility structures.
*   **Technology Stack & Trackers**: Detects frontend frameworks, CDNs, widgets, Google Fonts, and tracking scripts (Google Analytics, Facebook Pixel, Intercom, Crisp, Stripe, Mixpanel, etc.).
*   **Wayback Machine Archive History**: Polls the Internet Archive to determine when a website was first index-captured.
*   **HTTP Protocol Checker**: Inspects socket negotiations and Alt-Svc headers to report HTTP/2 and HTTP/3 support.
*   **Geolocation & Hosting Provider**: Translates server IPs to geographical coordinates and maps ASNs to host names (Amazon AWS, GCP, Azure, Cloudflare, DigitalOcean).
*   **DNS Zone Resolution**: Concurrently queries A, AAAA, MX, TXT, and NS records via Google's DNS-over-HTTPS.
*   **Visual Assets & Colors**: Spawns a headless Puppeteer instance to capture base64 viewport screenshots and extracts the dominant color palette directly on the canvas.
*   **Traffic Popularity**: Cross-references global rankings against weekly Tranco data.

---

## ⚡ Performance Optimizations

1.  **Debounced Prefetching (P1)**: When a user starts typing in the search bar, the client waits 500ms and fires a background `/api/prefetch` request. This runs IP Geolocation and RDAP registration services ahead of time. When the user clicks "Scan", these elements load instantly from the cache.
2.  **SSE Progressive Stream (F1 & P2)**: Instead of blocking on slow services, the client connects to an EventSource streaming route. As each service completes, the backend updates SQLite, and cards pop in with smooth CSS skeleton shimmers.
3.  **Task Timeout Tuning (P3)**: All scanner tasks are wrapped in customized timeouts to guarantee speedy runs:
    *   **Fast Tasks (IP, DNS)**: 5-second timeout limit.
    *   **Medium Tasks (GNews, GitHub, Stack)**: 7-second timeout limit.
    *   **Slow Tasks (SSL, Wayback)**: 15-second timeout limit.

---

## ⌨️ Keyboard Shortcuts & UX Utilities

For command-line power users, the dashboard features active key bindings:

| Shortcut | Action |
|---|---|
| `Ctrl + K` or `/` | Focus first target domain input |
| `Enter` | Trigger scan execution |
| `Escape` | Clear current search inputs and reset grid |
| `Ctrl + E` | Export complete report as Markdown |
| `Ctrl + S` | Copy shareable URL to clipboard |

---

## ⚙️ Environment Variables Configuration

Create a `.env` file inside the `backend/` directory.

```env
# Required for Performance Card (PageSpeed Insights)
PAGESPEED_API_KEY=AIzaSyCqN...

# Required for GNews Card
GNEWS_API_KEY=gnews_key_here...

# Optional: Required for GitHub stats lookup
GITHUB_API_KEY=github_pat_here...

# Optional: Remote DB configuration (defaults to local SQLite if omitted)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

---

## 🛠️ Developer Setup & Installation Guide

### Backend Service (FastAPI)
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create and activate virtual environment:
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\Activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run FastAPI app:
    ```bash
    uvicorn app.main:app --reload
    ```
    The Swagger UI documentation is available at `http://localhost:8000/docs`.

### Frontend Client (React)
1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the development server:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` to view the Recon Pulse dashboard locally.

---

## 🧪 Running Unit Tests
Recon Pulse contains a test suite checking RDAP parsing, DNS queries, SSL handshakes, and caching layers:
```bash
cd backend
.\venv\Scripts\python -m pytest tests
```
All tests must pass before deploying or pushing commits.

---

## 📄 License
This project is open-source and licensed under the MIT License.
