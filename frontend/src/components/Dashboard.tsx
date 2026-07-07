import { useEffect, useRef, useState } from "react";
import axios from 'axios';
import { ScanTicker } from "./ScanTicker";

interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

interface ReportProps {
  id?: string;
  url?: string;
  screenshot_url?: string;
  og_title?: string;
  og_description?: string;
  executive_summary?: string;
  favicon?: string;
  tech_stack?: {
    technologies: string[];
    categories: Record<string, string[]>;
    trackers: string[];
    fonts: string[];
  };
  security?: {
    ssl_grade?: string;
    https?: boolean;
    headers_grade?: string;
  };
  performance?: {
    performance_score?: number;
    lcp?: number;
    cls?: number;
    fcp?: number;
  };
  hosting?: {
    ip?: string;
    country?: string;
    city?: string;
    isp?: string;
    asn?: string;
    provider_name?: string;
  };
  domain?: {
    registrar?: string;
    created_date?: string;
    expires_date?: string;
    age_years?: number;
    days_to_expire?: number;
    nameservers?: string[];
  };
  http_version?: {
    http2?: boolean;
    http3?: boolean;
  };
  email_security?: {
    spf?: boolean;
    dmarc?: boolean;
    dkim?: boolean;
    spf_record?: string;
    dmarc_record?: string;
  };
  social?: {
    twitter?: boolean;
    linkedin?: boolean;
    github?: boolean;
    instagram?: boolean;
    facebook?: boolean;
    youtube?: boolean;
  };
  redirect_chain?: {
    hops: RedirectHop[];
    total: number;
  };
  wayback?: {
    first_seen?: string;
    latest_snapshot?: string;
    available?: boolean;
  };
  robots?: {
    robots_txt?: string;
    sitemap_url?: string;
    has_sitemap?: boolean;
  };
  threat_intel?: {
    virustotal_malicious: number;
    virustotal_suspicious: number;
    virustotal_clean: number;
    alienvault_pulses: number;
    alienvault_malicious: boolean;
    shodan_ports: number[];
    shodan_vulns: string[];
    shodan_org?: string;
    threat_score: number;
  };
  traffic?: {
    tranco_rank?: number;
    rank_label?: string;
  };
  github?: {
    username?: string;
    avatar_url?: string;
    public_repos?: number;
    followers?: number;
    top_repos?: { name: string; url: string; stars?: number }[];
  };
  news?: { source: string; title: string; date: string; url: string }[];
  dns_records?: Record<string, string[]>;
}

export function Dashboard() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  
  // Scans input states
  const [urlInput, setUrlInput] = useState('');
  const [urlInputB, setUrlInputB] = useState('');
  
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportIdB, setReportIdB] = useState<string | null>(null);
  
  const [report, setReport] = useState<ReportProps | null>(null);
  const [reportB, setReportB] = useState<ReportProps | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  
  const [extractedColors, setExtractedColors] = useState<{ dominant: string; palette: string[] } | null>(null);
  const [extractedColorsB, setExtractedColorsB] = useState<{ dominant: string; palette: string[] } | null>(null);
  
  const [activeDnsTab, setActiveDnsTab] = useState('A');
  const [activeDnsTabB, setActiveDnsTabB] = useState('A');

  const [showFullRobots, setShowFullRobots] = useState(false);
  const [showFullRobotsB, setShowFullRobotsB] = useState(false);
  const [paletteTimeout, setPaletteTimeout] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setPaletteTimeout(false);
      return;
    }
    const timer = setTimeout(() => {
      setPaletteTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [reportId]);

  // Load history on mount
  const [history, setHistory] = useState<any[]>(() =>
    JSON.parse(localStorage.getItem('rp_history') || '[]')
  );

  // Dark/Light Mode state
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('rp_theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rp_theme', theme);
  }, [theme]);

  // Scan History manager
  const saveHistory = (url: string, id: string) => {
    const h = JSON.parse(localStorage.getItem('rp_history') || '[]');
    const updated = [
      { url, reportId: id, ts: Date.now() },
      ...h.filter((x: any) => x.url !== url)
    ].slice(0, 8);
    localStorage.setItem('rp_history', JSON.stringify(updated));
    setHistory(updated);
  };

  const removeHistoryItem = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const updated = history.filter(x => x.url !== url);
    localStorage.setItem('rp_history', JSON.stringify(updated));
    setHistory(updated);
  };

  const handleRetry = async (serviceName: string) => {
    if (!reportId) return;
    const apiBase = import.meta.env.VITE_API_URL || 'https://recon-pulse.onrender.com';
    try {
      const res = await axios.post(`${apiBase}/api/report/${reportId}/refresh/${serviceName}`);
      setReport(res.data);
    } catch (err) {
      console.log("Retry failed:", err);
    }
  };

  const handleRetryB = async (serviceName: string) => {
    if (!reportIdB) return;
    const apiBase = import.meta.env.VITE_API_URL || 'https://recon-pulse.onrender.com';
    try {
      const res = await axios.post(`${apiBase}/api/report/${reportIdB}/refresh/${serviceName}`);
      setReportB(res.data);
    } catch (err) {
      console.log("Retry B failed:", err);
    }
  };

  const renderRefreshButton = (serviceName: string, isEmpty: boolean, side: 'A' | 'B') => {
    if (!isEmpty) return null;
    return (
      <button
        onClick={() => side === 'A' ? handleRetry(serviceName) : handleRetryB(serviceName)}
        className="text-[9px] font-mono text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 rounded px-1.5 py-0.5 hover:bg-[var(--accent-blue)]/10 transition-all ml-auto cursor-pointer"
      >
        ↻ Refresh
      </button>
    );
  };

  // Keyboard hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (report) exportMarkdown();
      }
      if (e.key === 'Escape') {
        setUrlInput('');
        setUrlInputB('');
        setReport(null);
        setReportB(null);
        setReportId(null);
        setReportIdB(null);
        setExtractedColors(null);
        setExtractedColorsB(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [report, reportB]);

  // EventSource Stream report A
  useEffect(() => {
    if (!reportId) return;
    const apiBase = import.meta.env.VITE_API_URL || 'https://recon-pulse.onrender.com';
    const es = new EventSource(`${apiBase}/api/report/${reportId}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status === 'timeout') {
          es.close();
          setSubmitting(false);
          return;
        }
        setReport(data);
        if (data.screenshot_url) {
          extractColors(data.screenshot_url, false);
        }
        if (data.status === 'complete') {
          es.close();
          setSubmitting(false);
          saveHistory(data.url, reportId);
        }
      } catch (err) {
        es.close();
        setSubmitting(false);
      }
    };
    es.onerror = () => {
      es.close();
      setSubmitting(false);
    };
    return () => es.close();
  }, [reportId]);

  // EventSource Stream report B
  useEffect(() => {
    if (!reportIdB) return;
    const apiBase = import.meta.env.VITE_API_URL || 'https://recon-pulse.onrender.com';
    const es = new EventSource(`${apiBase}/api/report/${reportIdB}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status === 'timeout') {
          es.close();
          setSubmitting(false);
          return;
        }
        setReportB(data);
        if (data.screenshot_url) {
          extractColors(data.screenshot_url, true);
        }
        if (data.status === 'complete') {
          es.close();
          setSubmitting(false);
          saveHistory(data.url, reportIdB);
        }
      } catch (err) {
        es.close();
        setSubmitting(false);
      }
    };
    es.onerror = () => {
      es.close();
      setSubmitting(false);
    };
    return () => es.close();
  }, [reportIdB]);

  // Color Palette Canvas Extractor
  const extractColors = (imgUrl: string, isB: boolean = false) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data;
      const colorCounts: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i+1] / 32) * 32;
        const b = Math.round(data[i+2] / 32) * 32;
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        if (hex !== '#000000' && hex !== '#ffffff') {
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
      }
      const sorted = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
      const palette = sorted.slice(0, 6);
      if (isB) {
        setExtractedColorsB({ dominant: palette[0] || '#3b82f6', palette });
      } else {
        setExtractedColors({ dominant: palette[0] || '#3b82f6', palette });
      }
    };
    img.src = imgUrl;
  };

  // Perform Scans
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setSubmitting(true);
    setReport(null);
    setReportB(null);
    setReportId(null);
    setReportIdB(null);
    setExtractedColors(null);
    setExtractedColorsB(null);

    const apiBase = import.meta.env.VITE_API_URL || 'https://recon-pulse.onrender.com';
    try {
      const res = await axios.post(`${apiBase}/api/report`, { url: urlInput });
      setReportId(res.data.report_id);
    } catch (err) {
      setSubmitting(false);
    }

    if (compareMode && urlInputB.trim()) {
      try {
        const resB = await axios.post(`${apiBase}/api/report`, { url: urlInputB });
        setReportIdB(resB.data.report_id);
      } catch (err) {
        // ignore B failure
      }
    }
  };

  const handleHistoryClick = (item: any) => {
    setUrlInput(item.url);
    setReportId(item.reportId);
    setReport(null);
    setReportB(null);
    setReportIdB(null);
    setExtractedColors(null);
    setExtractedColorsB(null);
  };

  // Export report Markdown
  const exportMarkdown = () => {
    if (!report) return;
    const md = `# Recon Pulse Report: ${report.url}
> Generated ${new Date().toLocaleDateString()} by Recon Pulse

## 📝 Security Executive Summary
${report.executive_summary || 'No executive summary available.'}

## 🔒 Security
- SSL Grade: ${report.security?.ssl_grade || 'N/A'}
- HTTPS: ${report.security?.https ? '✓' : '✗'}
- SPF: ${report.email_security?.spf ? '✓ Pass' : '✗ Fail'}
- DMARC: ${report.email_security?.dmarc ? '✓ Pass' : '✗ Fail'}
- DKIM: ${report.email_security?.dkim ? '✓ Pass' : '✗ Fail'}
- Threat Score: ${report.threat_intel?.threat_score || 0}/100

## ⚡ Performance
- Score: ${report.performance?.performance_score || 'N/A'}/100
- LCP: ${report.performance?.lcp || 'N/A'}s
- CLS: ${report.performance?.cls || 'N/A'}

## 🛠 Tech Stack
${report.tech_stack?.technologies?.join(', ') || 'None detected'}

## 🌍 Hosting
- Provider: ${report.hosting?.provider_name || report.hosting?.isp || 'N/A'}
- Location: ${report.hosting?.city || ''}, ${report.hosting?.country || ''}
- IP: ${report.hosting?.ip || 'N/A'}

## 📊 Traffic
- Rank: #${report.traffic?.tranco_rank || 'N/A'} (${report.traffic?.rank_label || 'N/A'})

## 🕵️ Trackers
${report.tech_stack?.trackers?.join(', ') || 'None detected'}

## 🔤 Fonts
${report.tech_stack?.fonts?.join(', ') || 'None detected'}

---
*Report ID: ${reportId}*`;
    navigator.clipboard.writeText(md);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  // Compare mode winners
  const getWinner = (metric: 'security' | 'performance' | 'threat' | 'traffic') => {
    if (!report || !reportB) return null;
    if (metric === 'performance') {
      const pA = report.performance?.performance_score ?? 0;
      const pB = reportB.performance?.performance_score ?? 0;
      if (pA === pB) return null;
      return pA > pB ? 'A' : 'B';
    }
    if (metric === 'threat') {
      const tA = report.threat_intel?.threat_score ?? 100;
      const tB = reportB.threat_intel?.threat_score ?? 100;
      if (tA === tB) return null;
      return tA < tB ? 'A' : 'B';
    }
    if (metric === 'traffic') {
      const trA = report.traffic?.tranco_rank ?? 99999999;
      const trB = reportB.traffic?.tranco_rank ?? 99999999;
      if (trA === trB) return null;
      return trA < trB ? 'A' : 'B';
    }
    if (metric === 'security') {
      const gMap: Record<string, number> = { 'A+': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
      const gA = gMap[(report.security?.ssl_grade || '').toUpperCase()] ?? 0;
      const gB = gMap[(reportB.security?.ssl_grade || '').toUpperCase()] ?? 0;
      if (gA === gB) return null;
      return gA > gB ? 'A' : 'B';
    }
    return null;
  };

  const getCardBorder = (cardName: 'security' | 'performance' | 'threat' | 'traffic', side: 'A' | 'B') => {
    if (!compareMode) return '';
    const winner = getWinner(cardName);
    if (!winner) return '';
    return winner === side ? 'border-[var(--accent-green)] shadow-[var(--glow-green)] border-2 animate-pulse' : 'opacity-60';
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const copyAllHex = (palette: string[]) => {
    navigator.clipboard.writeText(palette.join(', '));
    setCopiedHex('all');
    setTimeout(() => setCopiedHex(null), 2000);
  };

  // Helper renderer for circle gauge
  const renderCircleGauge = (score: number) => {
    let color = 'var(--accent-red)';
    if (score >= 90) color = 'var(--accent-green)';
    else if (score >= 50) color = 'var(--accent-orange)';
    
    return (
      <svg viewBox="0 0 100 100" width="120" height="120" className="mx-auto my-2">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={color}
          strokeWidth="8" strokeDasharray={`${score * 2.51} 251`}
          strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-500"/>
        <text x="50" y="56" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="bold">{score}</text>
      </svg>
    );
  };

  return (
    <div className="flex flex-col min-h-screen px-4 md:px-8 py-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-[var(--border)] pb-4">
        <div className="font-mono text-xl font-bold tracking-widest text-[var(--accent-blue)]">
          RECON_PULSE
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 rounded border border-[var(--border)] text-sm font-medium transition-all ${
              compareMode ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white' : 'hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            ⇄ Compare
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-3 py-1.5 rounded border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg-card-hover)] transition-all"
          >
            ◐ Theme
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Dashboard link copied to clipboard!");
            }}
            className="px-3 py-1.5 rounded border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg-card-hover)] transition-all"
          >
            ↗ Share
          </button>
          <button
            onClick={exportMarkdown}
            className="px-3 py-1.5 rounded border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg-card-hover)] transition-all relative"
          >
            {exportCopied ? '✓ Copied!' : '↓ Export'}
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="flex flex-col items-center space-y-3 w-full max-w-2xl mx-auto py-4">
        <form onSubmit={handleScan} className="flex w-full space-x-2 relative">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input
              id="search-input"
              ref={searchInputRef}
              type="text"
              placeholder="Enter domain to scan... (e.g. stripe.com)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-10 pr-16 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-all"
              style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--text-muted)] px-1.5 py-0.5 border border-[var(--border)] rounded bg-[var(--bg-primary)]">
              ⌘K
            </span>
          </div>
          {compareMode && (
            <input
              type="text"
              placeholder="Compare domain..."
              value={urlInputB}
              onChange={(e) => setUrlInputB(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-all"
            />
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-[var(--accent-blue)] text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center space-x-1"
          >
            <span>{submitting ? 'SCANNING...' : 'SCAN'}</span>
            <span>→</span>
          </button>
        </form>

        {/* Scan History Chips */}
        {history.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleHistoryClick(item)}
                className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-bright)] cursor-pointer text-xs font-mono transition-all"
              >
                <span>{item.url}</span>
                <span
                  onClick={(e) => removeHistoryItem(e, item.url)}
                  className="hover:text-[var(--accent-red)] font-sans font-bold pl-1 text-[10px]"
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid View */}
      <div className="flex flex-col space-y-6">
        {compareMode && (
          <div className="grid grid-cols-2 gap-4 border-b border-[var(--border)] pb-2 text-center font-semibold tracking-wider text-sm text-[var(--text-secondary)]">
            <div>TARGET A: {urlInput || 'Empty'}</div>
            <div>TARGET B: {urlInputB || 'Empty'}</div>
          </div>
        )}

        <div className={`grid ${compareMode ? 'grid-cols-1 md:grid-cols-2 gap-6' : 'grid-cols-1 gap-6'}`}>
          {/* Side A */}
          <div className="space-y-6">
            {reportId && !report && submitting ? renderBentoGrid(null, true, 'A') : report && renderBentoGrid(report, false, 'A')}
          </div>

          {/* Side B */}
          {compareMode && (
            <div className="space-y-6">
              {reportIdB && !reportB && submitting ? renderBentoGrid(null, true, 'B') : reportB && renderBentoGrid(reportB, false, 'B')}
            </div>
          )}
        </div>
      </div>
      <ScanTicker report={report} submitting={submitting} />
    </div>
  );

  // Bento grid mapping function
  function renderBentoGrid(data: ReportProps | null, isSkeleton: boolean, side: 'A' | 'B') {
    const activeDns = side === 'A' ? activeDnsTab : activeDnsTabB;
    const setActiveDns = side === 'A' ? setActiveDnsTab : setActiveDnsTabB;
    const colors = side === 'A' ? extractedColors : extractedColorsB;
    const showFullRob = side === 'A' ? showFullRobots : showFullRobotsB;
    const setShowFullRob = side === 'A' ? setShowFullRobots : setShowFullRobotsB;

    if (isSkeleton) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card md:col-span-2 h-[340px] skeleton"></div>
          <div className="card h-[340px] skeleton"></div>
          <div className="card h-[300px] skeleton"></div>
          <div className="card h-[300px] skeleton"></div>
          <div className="card h-[300px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[260px] skeleton"></div>
          <div className="card h-[260px] skeleton"></div>
          <div className="card h-[260px] skeleton"></div>
          <div className="card md:col-span-3 h-[240px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
          <div className="card h-[280px] skeleton"></div>
        </div>
      );
    }

    if (!data) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 fade-in">
        {data.executive_summary && (
          <div className="card md:col-span-3 border-[var(--border)] border-l-4 border-l-[var(--accent-blue)] bg-[var(--bg-card)] p-4 text-left">
            <div className="text-[10px] uppercase font-bold text-[var(--accent-blue)] tracking-wider mb-1.5">Security Executive Summary</div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-medium">
              {data.executive_summary}
            </p>
          </div>
        )}
        {/* Screenshot Card */}
        <div className="card md:col-span-2 h-[340px] flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Screenshot & Metadata</span>
            {renderRefreshButton("screenshot", !data.screenshot_url, side)}
          </div>
          <div className="flex-1 relative bg-[var(--bg-primary)] rounded overflow-hidden flex items-center justify-center">
            {data.screenshot_url ? (
              <img
                src={data.screenshot_url}
                alt="Scan snapshot"
                className="w-full h-full object-cover object-top hover:scale-[1.03] transition-all duration-300"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                <span className="text-4xl mb-1">🖼️</span>
                <span className="text-xs">No screenshot available</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur px-3 py-2 flex items-center space-x-2 text-xs">
              {data.favicon && <img src={data.favicon} alt="Favicon" className="w-4 h-4 rounded-sm" />}
              <div className="flex-1 min-w-0 text-left">
                <div className="font-semibold text-white truncate">{data.url}</div>
                <div className="text-[var(--text-secondary)] text-[10px] truncate">{data.og_title || data.og_description || 'No meta tags detected'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack Card */}
        <div className="card h-[340px] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Tech Stack</span>
            {renderRefreshButton("tech_stack", !data.tech_stack?.technologies?.length, side)}
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs text-left">
            {data.tech_stack?.technologies && data.tech_stack.technologies.length > 0 ? (
              Object.entries(data.tech_stack.categories || {}).map(([cat, techs]) => {
                let dotColor = 'bg-[var(--accent-purple)]';
                if (cat.toLowerCase().includes('front')) dotColor = 'bg-[var(--accent-blue)]';
                else if (cat.toLowerCase().includes('server') || cat.toLowerCase().includes('back')) dotColor = 'bg-[var(--accent-green)]';
                else if (cat.toLowerCase().includes('cdn')) dotColor = 'bg-[var(--accent-orange)]';

                return (
                  <div key={cat} className="space-y-1">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">{cat}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {techs.map(t => (
                        <span key={t} className="badge badge-grey py-0.5 px-2 flex items-center space-x-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                          <span>{t}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-[var(--text-muted)] py-12">No technologies detected</div>
            )}
          </div>
        </div>

        {/* Security Card */}
        <div className={`card h-[300px] flex flex-col justify-between ${getCardBorder('security', side)}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Security Grade</span>
            {renderRefreshButton("security", !data.security?.ssl_grade, side)}
          </div>
          <div className="text-center py-4">
            <div className="text-6xl font-extrabold" style={{
              color: ['A+', 'A', 'B'].includes(data.security?.ssl_grade || '') ? 'var(--accent-green)' :
                     ['C', 'D'].includes(data.security?.ssl_grade || '') ? 'var(--accent-orange)' : 'var(--accent-red)'
            }}>
              {data.security?.ssl_grade || 'F'}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">SSL Certificate Grade</div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className={`badge ${data.security?.https ? 'badge-green' : 'badge-red'}`}>
              {data.security?.https ? '✓ HTTPS Active' : '✕ No HTTPS'}
            </span>
            <span className="badge badge-blue">
              Headers: {data.security?.headers_grade || 'C'}
            </span>
          </div>
        </div>

        {/* Performance Card */}
        <div className={`card h-[300px] flex flex-col justify-between ${getCardBorder('performance', side)}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Performance</span>
            {renderRefreshButton("performance", data.performance?.performance_score === 0 || data.performance?.performance_score === undefined, side)}
          </div>
          <div>
            {renderCircleGauge(data.performance?.performance_score || 0)}
          </div>
          <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-[var(--text-secondary)] border-t border-[var(--border)] pt-2">
            <div>
              <div className="font-semibold text-[var(--text-primary)]">{data.performance?.lcp || 'N/A'}s</div>
              <div>LCP</div>
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">{data.performance?.cls || 'N/A'}</div>
              <div>CLS</div>
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">{data.performance?.fcp || 'N/A'}s</div>
              <div>FCP</div>
            </div>
          </div>
        </div>

        {/* Threat Intel Card */}
        <div className={`card h-[300px] flex flex-col justify-between ${getCardBorder('threat', side)}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Threat Intel</span>
            {renderRefreshButton("threat_intel", data.threat_intel?.threat_score === undefined, side)}
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--border)] pb-3">
            <div className="text-left">
              <div className="text-3xl font-extrabold" style={{
                color: (data.threat_intel?.threat_score || 0) > 50 ? 'var(--accent-red)' :
                       (data.threat_intel?.threat_score || 0) > 20 ? 'var(--accent-orange)' : 'var(--accent-green)'
              }}>
                {data.threat_intel?.threat_score || 0}/100
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">Composite Threat Index</div>
            </div>
            {(data.threat_intel?.threat_score || 0) === 0 ? (
              <span className="badge badge-green shadow-[var(--glow-green)]">✓ Clean</span>
            ) : (
              <span className="badge badge-red">✕ Threat</span>
            )}
          </div>
          <div className="space-y-1.5 text-xs text-left">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">VirusTotal:</span>
              <span className="font-semibold font-mono text-[var(--accent-red)]">
                {data.threat_intel?.virustotal_malicious || 0} malicious
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">AlienVault:</span>
              <span className="font-semibold font-mono">
                {data.threat_intel?.alienvault_pulses || 0} pulses
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Shodan Ports:</span>
              <span className="font-mono">
                {data.threat_intel?.shodan_ports && data.threat_intel.shodan_ports.length > 0 ? (
                  data.threat_intel.shodan_ports.join(', ')
                ) : (
                  'none'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Hosting Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Hosting</span>
            {renderRefreshButton("hosting", !data.hosting?.ip, side)}
          </div>
          <div className="py-2 text-left">
            <div className="text-lg font-bold text-[var(--text-primary)] tracking-wide truncate">
              {data.hosting?.provider_name || data.hosting?.isp || 'Unknown Cloud'}
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">{data.hosting?.ip || '0.0.0.0'}</div>
          </div>
          <div className="border-t border-[var(--border)] pt-2.5 text-xs space-y-1 text-left">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Location:</span>
              <span>
                {data.hosting?.city || 'Unknown'}, {data.hosting?.country || 'Unknown'} 🗺️
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">ISP:</span>
              <span className="truncate max-w-[140px]">{data.hosting?.isp || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">ASN:</span>
              <span className="font-mono">{data.hosting?.asn || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Domain Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Domain</span>
            {renderRefreshButton("domain", !data.domain?.registrar, side)}
          </div>
          <div className="py-1 text-left">
            <div className="text-xs text-[var(--text-secondary)] truncate">Registrar:</div>
            <div className="text-sm font-semibold truncate">{data.domain?.registrar || 'N/A'}</div>
          </div>
          <div className="border-t border-[var(--border)] pt-2 text-xs space-y-1 text-left">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Created:</span>
              <span>{data.domain?.created_date?.split('T')[0] || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Age:</span>
              <span className="font-semibold text-[var(--accent-blue)]">{data.domain?.age_years || 0} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Expires:</span>
              <span style={{ color: (data.domain?.days_to_expire || 365) < 90 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                {data.domain?.expires_date?.split('T')[0] || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* HTTP Version Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">HTTP Version</span>
            {renderRefreshButton("http_version", !data.http_version?.http2 && !data.http_version?.http3, side)}
          </div>
          <div className="space-y-3 py-2 text-xs text-left">
            <div className="flex justify-between items-center">
              <span>HTTP/1.1</span>
              <span className="badge badge-green">● Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span>HTTP/2</span>
              {data.http_version?.http2 ? (
                <span className="badge badge-green">● Active</span>
              ) : (
                <span className="badge badge-grey">✕ Inactive</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span>HTTP/3</span>
              {data.http_version?.http3 ? (
                <span className="badge badge-blue">● Active</span>
              ) : (
                <span className="badge badge-grey">✕ Inactive</span>
              )}
            </div>
          </div>
        </div>

        {/* Email Security Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Email Security</span>
            {renderRefreshButton("email_security", !data.email_security?.spf && !data.email_security?.dmarc, side)}
          </div>
          <div className="space-y-2 py-2 text-xs text-left">
            <div className="flex justify-between items-center">
              <span className="font-mono">SPF:</span>
              {data.email_security?.spf ? (
                <span className="badge badge-green cursor-help" title={data.email_security.spf_record}>✓ PASS</span>
              ) : (
                <span className="badge badge-red">✕ FAIL</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono">DMARC:</span>
              {data.email_security?.dmarc ? (
                <span className="badge badge-green cursor-help" title={data.email_security.dmarc_record}>✓ PASS</span>
              ) : (
                <span className="badge badge-red">✕ FAIL</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono">DKIM:</span>
              {data.email_security?.dkim ? (
                <span className="badge badge-green">✓ PASS</span>
              ) : (
                <span className="badge badge-red">✕ FAIL</span>
              )}
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-2 text-center">
            {data.email_security?.spf && data.email_security?.dmarc ? (
              <span className="badge badge-green py-0.5">Secure</span>
            ) : (
              <span className="badge badge-yellow py-0.5">Vulnerable</span>
            )}
          </div>
        </div>

        {/* Social Presence Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Social Presence</span>
            {renderRefreshButton("social", !data.social || !Object.values(data.social).some(v => v), side)}
          </div>
          <div className="grid grid-cols-2 gap-2 py-1 text-xs">
            {[
              { name: 'Twitter', active: data.social?.twitter, color: 'text-sky-400 border-sky-400/40 bg-sky-400/10', link: `https://twitter.com/${data.url?.split('.')[0]}` },
              { name: 'LinkedIn', active: data.social?.linkedin, color: 'text-blue-400 border-blue-400/40 bg-blue-400/10', link: `https://linkedin.com/company/${data.url?.split('.')[0]}` },
              { name: 'GitHub', active: data.social?.github, color: 'text-neutral-300 border-neutral-300/40 bg-neutral-300/10', link: `https://github.com/${data.url?.split('.')[0]}` },
              { name: 'Instagram', active: data.social?.instagram, color: 'text-pink-400 border-pink-400/40 bg-pink-400/10', link: `https://instagram.com/${data.url?.split('.')[0]}` },
              { name: 'Facebook', active: data.social?.facebook, color: 'text-indigo-400 border-indigo-400/40 bg-indigo-400/10', link: `https://facebook.com/${data.url?.split('.')[0]}` },
              { name: 'YouTube', active: data.social?.youtube, color: 'text-red-400 border-red-400/40 bg-red-400/10', link: `https://youtube.com/@${data.url?.split('.')[0]}` }
            ].map(p => p.active ? (
              <a
                key={p.name}
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className={`border rounded px-2.5 py-1.5 font-medium text-center transition-all hover:scale-[1.02] ${p.color}`}
              >
                {p.name}
              </a>
            ) : (
              <span
                key={p.name}
                className="border border-[var(--border)] rounded px-2.5 py-1.5 text-center text-[var(--text-muted)] bg-[var(--bg-primary)]/50 cursor-not-allowed"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Redirect Chain Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Redirect Chain</span>
            {renderRefreshButton("redirect_chain", !data.redirect_chain?.hops?.length, side)}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 py-2 pr-1 font-mono text-[10px] text-left">
            {data.redirect_chain?.hops && data.redirect_chain.hops.length > 0 ? (
              data.redirect_chain.hops.map((h, i) => (
                <div key={i} className="flex items-center space-x-1.5 truncate">
                  <span className="text-[var(--text-muted)]">{i + 1}</span>
                  <span className="text-[var(--text-secondary)] truncate flex-1">{h.url}</span>
                  <span className={`badge py-0 px-1.5 ${
                    h.status >= 400 ? 'badge-red' :
                    h.status >= 300 ? 'badge-yellow' : 'badge-green'
                  }`}>
                    {h.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[var(--text-muted)] text-center py-12">No redirect hops</div>
            )}
          </div>
        </div>

        {/* Trackers Card */}
        <div className="card h-[260px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Trackers</span>
            {renderRefreshButton("tech_stack", !data.tech_stack?.trackers?.length, side)}
          </div>
          <div className="text-xs font-semibold py-1 text-left">
            {data.tech_stack?.trackers ? `${data.tech_stack.trackers.length} tracking services found` : '0 trackers detected'}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-1 text-xs text-left">
            {data.tech_stack?.trackers && data.tech_stack.trackers.length > 0 ? (
              data.tech_stack.trackers.map(t => {
                let badgeClass = 'badge-yellow';
                if (['Facebook Pixel', 'TikTok Pixel', 'Twitter Pixel'].includes(t)) badgeClass = 'badge-red';
                else if (['Intercom', 'Crisp', 'Drift', 'Zendesk'].includes(t)) badgeClass = 'badge-blue';
                else if (['Stripe'].includes(t)) badgeClass = 'badge-green';

                return (
                  <span key={t} className={`badge ${badgeClass} mr-1.5 mb-1.5`}>
                    {t}
                  </span>
                );
              })
            ) : (
              <div className="text-center text-[var(--accent-green)] py-8 font-semibold">✓ Clean: No Trackers Found</div>
            )}
          </div>
        </div>

        {/* Fonts Card */}
        <div className="card h-[260px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Fonts</span>
            {renderRefreshButton("tech_stack", !data.tech_stack?.fonts?.length, side)}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-2 text-left">
            {data.tech_stack?.fonts && data.tech_stack.fonts.length > 0 ? (
              data.tech_stack.fonts.map(font => {
                const fontUrlName = font.replace(/\s+/g, '+');
                return (
                  <div key={font} className="flex items-center space-x-2 text-xs">
                    <link
                      rel="stylesheet"
                      href={`https://fonts.googleapis.com/css2?family=${fontUrlName}&display=swap`}
                    />
                    <span className="badge badge-grey py-0.5 px-2 font-mono">{font}</span>
                    <span style={{ fontFamily: `'${font}', sans-serif` }} className="text-sm truncate">
                      Quick brown fox jumps
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-[var(--text-muted)] text-center py-12">No custom fonts detected</div>
            )}
          </div>
        </div>

        {/* Carbon Card */}
        <div className="card h-[260px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Carbon</span>
            {renderRefreshButton("carbon", data.carbon?.co2_grams === undefined, side)}
          </div>
          <div className="py-2 flex items-center justify-between text-left">
            <div>
              <div className="text-3xl font-extrabold" style={{
                color: (data.carbon?.co2_grams || 0) > 0.5 ? 'var(--accent-red)' :
                       (data.carbon?.co2_grams || 0) > 0.1 ? 'var(--accent-orange)' : 'var(--accent-green)'
              }}>
                {data.carbon?.co2_grams || '0.00'}g
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">CO₂ per website visit</div>
            </div>
            <span className="text-4xl text-[var(--accent-green)]">🍃</span>
          </div>
          <div className="space-y-1.5 text-xs text-left">
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-0.5">
              <span>Eco Status</span>
              <span>{data.carbon?.cleaner_percentage || 0}% cleaner</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--border)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--accent-green)] transition-all"
                style={{ width: `${data.carbon?.cleaner_percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* News Card (full width) */}
        <div className="card md:col-span-3 h-[240px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">News</span>
            {renderRefreshButton("news", !data.news?.length, side)}
          </div>
          <div className="flex-1 flex overflow-x-auto space-x-4 py-3 pr-1 scrollbar-thin">
            {data.news && data.news.length > 0 ? (
              data.news.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0 w-[280px] p-3 rounded bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all flex flex-col justify-between text-left"
                >
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide truncate mb-1">
                    {item.source}
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 leading-relaxed">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-2 font-mono">
                    {item.date?.split('T')[0] || 'Recent'}
                  </div>
                </a>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
                No recent news mentions found
              </div>
            )}
          </div>
        </div>

        {/* Tabbed DNS Records Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">DNS Records</span>
              {renderRefreshButton("dns", !data.dns_records || !Object.keys(data.dns_records).length, side)}
            </div>
            <div className="flex space-x-1">
              {['A', 'AAAA', 'MX', 'TXT', 'NS'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveDns(tab)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    activeDns === tab
                      ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white font-bold'
                      : 'border-[var(--border)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] text-[var(--text-secondary)] space-y-1 text-left">
            {data.dns_records && data.dns_records[activeDns] && data.dns_records[activeDns].length > 0 ? (
              data.dns_records[activeDns].map((rec, i) => (
                <div key={i} className="truncate p-1 bg-[var(--bg-primary)]/50 rounded border border-[var(--border)]/30">
                  {rec}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-[var(--text-muted)]">No records for {activeDns}</div>
            )}
          </div>
        </div>

        {/* Robots.txt Card */}
        <div className="card h-[280px] flex flex-col justify-between overflow-hidden relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Robots.txt</span>
            {renderRefreshButton("robots", !data.robots?.robots_txt, side)}
          </div>
          <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-2.5 rounded border border-[var(--border)] text-[9px] font-mono leading-relaxed select-all text-left">
            {data.robots?.robots_txt ? (
              data.robots.robots_txt.split('\n').map((line, idx) => {
                let color = 'text-[var(--text-secondary)]';
                if (line.toLowerCase().startsWith('user-agent:')) color = 'text-sky-400';
                else if (line.toLowerCase().startsWith('disallow:')) color = 'text-red-400';
                else if (line.toLowerCase().startsWith('allow:')) color = 'text-emerald-400';
                else if (line.toLowerCase().startsWith('sitemap:')) color = 'text-yellow-400';

                return (
                  <div key={idx} className={color}>
                    {line}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-[var(--text-muted)] font-sans">Robots.txt not found</div>
            )}
          </div>
          {data.robots?.robots_txt && (
            <button
              onClick={() => setShowFullRob(true)}
              className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-bright)] text-[9px] font-semibold transition-all"
            >
              View Full
            </button>
          )}

          {/* Modal popup for robots.txt */}
          {showFullRob && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur flex items-center justify-center p-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg max-w-2xl w-full p-5 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 mb-3">
                  <span className="text-xs font-mono font-bold text-white">Full Robots.txt Content</span>
                  <button
                    onClick={() => setShowFullRob(false)}
                    className="text-lg hover:text-[var(--accent-red)] font-bold px-2"
                  >
                    ×
                  </button>
                </div>
                <pre className="flex-1 overflow-auto bg-[var(--bg-primary)] p-3 rounded text-xs font-mono text-[var(--text-secondary)] leading-relaxed select-all text-left">
                  {data.robots?.robots_txt}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Website Age Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Website Age</span>
            {renderRefreshButton("wayback", !data.wayback?.first_seen, side)}
          </div>
          <div className="py-2 text-left">
            <div className="text-3xl font-extrabold text-[var(--text-primary)]">
              {data.wayback?.first_seen || '2024'}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">First snapshot archived</div>
          </div>
          <div className="space-y-3 py-1 text-xs text-left">
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
              <span>Web Timeline</span>
              <span>Active</span>
            </div>
            <div className="relative h-2 bg-[var(--border)] rounded-full flex items-center">
              <div className="absolute left-0 right-0 h-0.5 bg-[var(--accent-blue)]"></div>
              <div className="absolute w-3.5 h-3.5 rounded-full bg-[var(--accent-blue)] border-2 border-[var(--bg-card)] shadow" style={{ left: '30%' }}></div>
            </div>
            <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono">
              <span>1995</span>
              <span>2026</span>
            </div>
          </div>
          {data.wayback?.latest_snapshot && (
            <a
              href={data.wayback.latest_snapshot}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-semibold text-[var(--accent-blue)] hover:underline text-center block pt-1.5"
            >
              View Snapshots ↗
            </a>
          )}
        </div>

        {/* Traffic Rank Card */}
        <div className={`card h-[280px] flex flex-col justify-between ${getCardBorder('traffic', side)}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Traffic Rank</span>
            {renderRefreshButton("traffic", !data.traffic?.tranco_rank, side)}
          </div>
          <div className="py-2 text-left">
            <div className="text-3xl font-extrabold text-[var(--text-primary)]">
              #{data.traffic?.tranco_rank ? data.traffic.tranco_rank.toLocaleString() : '1,000,000+'}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">Tranco Global Traffic Rank</div>
          </div>
          <div className="space-y-1.5 text-xs text-left">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--text-secondary)]">Classification:</span>
              <span className="font-bold text-[var(--accent-purple)]">{data.traffic?.rank_label || 'Low Tier'}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center text-[8px] font-semibold tracking-wider font-mono">
              {['100', '1K', '10K', '100K', '1M+'].map((tier, i) => {
                const colors = ['bg-amber-400', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-slate-500'];
                return (
                  <div key={tier}>
                    <div className={`h-2.5 rounded-sm ${colors[i]} opacity-80 mb-1`}></div>
                    <span className="text-[var(--text-muted)]">{tier}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* GitHub Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">GitHub</span>
            {renderRefreshButton("github", !data.github?.username, side)}
          </div>
          {data.github?.username ? (
            <div className="flex-1 flex flex-col justify-between py-2.5">
              <div className="flex items-center space-x-3 text-left">
                {data.github.avatar_url && <img src={data.github.avatar_url} alt="GitHub avatar" className="w-9 h-9 rounded-full border border-[var(--border)]" />}
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)] leading-none">@{data.github.username}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {data.github.public_repos || 0} repos • {data.github.followers || 0} followers
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-[10px] border-t border-[var(--border)] pt-2 mt-2 text-left">
                <div className="text-[var(--text-muted)] font-semibold uppercase">Top Repositories:</div>
                {data.github.top_repos?.slice(0, 3).map(r => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex justify-between items-center text-[var(--text-secondary)] hover:text-white truncate py-0.5"
                  >
                    <span className="truncate flex-1">✦ {r.name}</span>
                    <span className="font-mono text-[9px] text-[var(--text-muted)] pl-2">{r.stars || 0}★</span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
              No GitHub presence found
            </div>
          )}
        </div>

        {/* Color Palette Card */}
        <div className="card h-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Color Palette</span>
            {renderRefreshButton("screenshot", !colors || !colors.palette || colors.palette.length === 0, side)}
          </div>
          {colors && colors.palette && colors.palette.length > 0 ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-6 gap-2">
                {colors.palette.map(hex => (
                  <div
                    key={hex}
                    onClick={() => copyHex(hex)}
                    className="cursor-pointer group flex flex-col items-center space-y-1.5"
                  >
                    <div
                      className="w-8 h-8 rounded border border-white/10 shadow group-hover:scale-[1.06] transition-all relative"
                      style={{ backgroundColor: hex }}
                    >
                      {copiedHex === hex && (
                        <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center text-[9px] font-bold text-[var(--accent-green)]">
                          ✓
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] font-mono text-[var(--text-secondary)]">{hex}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--border)] pt-2.5 flex justify-between items-center text-xs text-left">
                <span className="text-[var(--text-muted)]">Dominant: {colors.dominant}</span>
                <button
                  onClick={() => copyAllHex(colors.palette)}
                  className="px-2.5 py-1.5 rounded border border-[var(--border)] hover:border-[var(--border-bright)] text-[10px] font-semibold relative transition-all"
                >
                  {copiedHex === 'all' ? 'Copied!' : 'Copy All'}
                </button>
              </div>
            </div>
          ) : paletteTimeout && !data.screenshot_url ? (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
              Screenshot required for palette
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
              colors loading...
            </div>
          )}
        </div>
      </div>
    );
  }
}
