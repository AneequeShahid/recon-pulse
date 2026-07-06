import { useEffect, useRef, useState, useCallback } from "react";
import axios from 'axios';
import { useReportStream } from '../hooks/useReportStream';
import { useWorkspace } from '../hooks/SessionWorkspace';
import { addScanHistory, getIntegrationKeys, setIntegrationKeys as saveIntegrationKeys, getScanHistory, getIgnoredFindings, addIgnoredFinding, isFindingIgnored } from '../hooks/useStorage';
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { AttackPathView } from './AttackPathView';

// Set default workspace header for all axios requests
const wsInterceptor = (config: any) => {
  const ws = localStorage.getItem('rp_workspace_id');
  if (ws) config.headers['X-Workspace-Id'] = ws;
  return config;
};
axios.interceptors.request.use(wsInterceptor);

const AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAyu8MpVA8eQoO2NaGUTP0oUdhDvx9ZR3Tkmgv4MHUW9rOsq72J13d3DjW0_cAu7njxxO-4uFiMQ5i73UOkMm_iEEUWwEXGNo_V7YjqwoW2TBq3Tqtg-33boBRUeWyhnptsvTaAN7lmq16W2t5uf08KCEVdVcpYVDnVL8Cj6ZSprDV-dXhG-KuvjLQxKw45zbRAjCPZIFSyXoWfjJRwElWv6TBqDUTnJkrKjNTyl1veFGZ2N8tlSNhkVw";

const PRIMARY = "#adc6ff";

const navItems = [
  { icon: "dashboard", label: "Overview", active: true },
];

export function Dashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  
  // Dynamic report polling state
  const [urlInput, setUrlInput] = useState('');
  const [urlInputB, setUrlInputB] = useState('');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeReportIdB, setActiveReportIdB] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const [extractedColors, setExtractedColors] = useState<{ dominant: string; palette: string[] } | null>(null);
  const [extractedColorsB, setExtractedColorsB] = useState<{ dominant: string; palette: string[] } | null>(null);

  const { workspaceId, recordScan } = useWorkspace();
  const { report, status } = useReportStream(activeReportId);
  const { report: reportB, status: statusB } = useReportStream(activeReportIdB);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [scanHistory, setScanHistory] = useState<any[]>(() => getScanHistory());
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [integrationKeys, setIntegrationKeys] = useState<any>(() => getIntegrationKeys());

  // Dark/Light Mode Toggle state
  const [theme, setTheme] = useState(() => localStorage.getItem('rp_theme') || 'dark');
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('rp_theme', nextTheme);
  };

  // Prefetch for urlInput
  useEffect(() => {
    if (!urlInput) return;
    const timer = setTimeout(() => {
      const target = urlInput.trim();
      if (target.length > 3) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        axios.post(`${apiBaseUrl}/api/prefetch`, { url: target })
          .catch((err) => console.log("Prefetch error:", err));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [urlInput]);

  // Prefetch for urlInputB if compareMode
  useEffect(() => {
    if (!urlInputB || !compareMode) return;
    const timer = setTimeout(() => {
      const target = urlInputB.trim();
      if (target.length > 3) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        axios.post(`${apiBaseUrl}/api/prefetch`, { url: target })
          .catch((err) => console.log("Prefetch B error:", err));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [urlInputB, compareMode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search bar
      if ((e.ctrlKey && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Export markdown
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
      // Copy share link
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleShare();
      }
      // Reset
      if (e.key === 'Escape') {
        setUrlInput('');
        setUrlInputB('');
        setActiveReportId(null);
        setActiveReportIdB(null);
        window.history.pushState(null, '', '/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [report, activeReportId, urlInput, urlInputB]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('rp_history') || '[]');
      setHistoryList(history);
    } catch (e) {
      console.warn('load history failed', e);
    }
  }, [status]);

  // Save successful scan to local history
  useEffect(() => {
    if (status === 'complete' && report && activeReportId) {
      try {
        const history = JSON.parse(localStorage.getItem('rp_history') || '[]');
        const entry = { url: report.url, reportId: activeReportId, timestamp: Date.now() };
        const updated = [entry, ...history.filter((h: any) => h.url !== report.url)].slice(0, 10);
        localStorage.setItem('rp_history', JSON.stringify(updated));
        setHistoryList(updated);
      } catch (e) {
        console.warn('save history failed', e);
      }
      // Record in workspace scan history
      recordScan({
        reportId: activeReportId,
        url: report.url,
        score: report.summary_score ?? 0,
        threat: report.threat_level ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
    }
  }, [status, report, activeReportId, recordScan]);

  // Load scan history from localStorage
  useEffect(() => {
    setScanHistory(getScanHistory());
  }, [status]);

  const handleHistoryClick = async (url: string) => {
    setUrlInput(url);
    setSubmitting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const { data } = await axios.post(`${apiBaseUrl}/api/report`, { url }, {
        headers: { 'X-Workspace-Id': workspaceId }
      });
      setActiveReportId(data.report_id);
      window.history.pushState(null, '', `/r/${data.report_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to start website intelligence scan.');
    } finally {
      setSubmitting(false);
    }
  };


  // Extract color palette from screenshot image using Canvas
  useEffect(() => {
    if (!report?.screenshot_url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 50, 50);
        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        const colorMap: Record<string, number> = {};
        for (let i = 0; i < imageData.length; i += 4) {
          const r = Math.round(imageData[i] / 32) * 32;
          const g = Math.round(imageData[i+1] / 32) * 32;
          const b = Math.round(imageData[i+2] / 32) * 32;
          const key = `${r},${g},${b}`;
          colorMap[key] = (colorMap[key] || 0) + 1;
        }
        const sorted = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([key]) => {
            const [r, g, b] = key.split(',');
            return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
          });
        setExtractedColors({
          dominant: sorted[0] || '#000000',
          palette: sorted
        });
      } catch(e) {
        console.warn('color extraction failed', e);
      }
    };
    img.src = report.screenshot_url;
  }, [report?.screenshot_url]);

  // Extract color palette from B screenshot image using Canvas
  useEffect(() => {
    if (!reportB?.screenshot_url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 50, 50);
        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        const colorMap: Record<string, number> = {};
        for (let i = 0; i < imageData.length; i += 4) {
          const r = Math.round(imageData[i] / 32) * 32;
          const g = Math.round(imageData[i+1] / 32) * 32;
          const b = Math.round(imageData[i+2] / 32) * 32;
          const key = `${r},${g},${b}`;
          colorMap[key] = (colorMap[key] || 0) + 1;
        }
        const sorted = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([key]) => {
            const [r, g, b] = key.split(',');
            return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
          });
        setExtractedColorsB({
          dominant: sorted[0] || '#000000',
          palette: sorted
        });
      } catch(e) {
        console.warn('color extraction B failed', e);
      }
    };
    img.src = reportB.screenshot_url;
  }, [reportB?.screenshot_url]);

  // Auto load report from path on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/r/')) {
      const id = path.replace('/r/', '');
      if (id) {
        setActiveReportId(id);
      }
    }
    const params = new URLSearchParams(window.location.search);
    const vs = params.get('vs');
    if (vs) {
      setActiveReportIdB(vs);
      setCompareMode(true);
    }
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    setSubmitting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      if (compareMode && urlInputB) {
        const [resA, resB] = await Promise.all([
          axios.post(`${apiBaseUrl}/api/report`, { url: urlInput }),
          axios.post(`${apiBaseUrl}/api/report`, { url: urlInputB })
        ]);
        setActiveReportId(resA.data.report_id);
        setActiveReportIdB(resB.data.report_id);
        window.history.pushState(null, '', `/r/${resA.data.report_id}?vs=${resB.data.report_id}`);
      } else {
        const { data } = await axios.post(`${apiBaseUrl}/api/report`, { url: urlInput });
        setActiveReportId(data.report_id);
        window.history.pushState(null, '', `/r/${data.report_id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start website intelligence scan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSecurityScore = (grade?: string) => {
    if (!grade) return 0;
    const g = grade.toUpperCase();
    if (g.includes('A+')) return 7;
    if (g.includes('A')) return 6;
    if (g.includes('B')) return 5;
    if (g.includes('C')) return 4;
    if (g.includes('D')) return 3;
    if (g.includes('F')) return 1;
    return 2;
  };


  const handleShare = () => {
    if (!activeReportId) return;
    const url = `${window.location.origin}/r/${activeReportId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!report) return;
    const md = `
# Recon Pulse Report: ${report.url}
Generated: ${new Date().toLocaleDateString()}

## Security
- SSL Grade: ${report.security?.ssl_grade || 'N/A'}
- HTTPS: ${report.security?.https ? '✓' : '✗'}
- SPF: ${report.email_security?.spf ? '✓' : '✗'}
- DMARC: ${report.email_security?.dmarc ? '✓' : '✗'}

## Performance
- Score: ${report.performance?.performance_score || 'N/A'}/100

## Tech Stack
${report.tech_stack?.technologies?.join(', ') || 'None detected'}

## Hosting
- IP: ${report.hosting?.ip || 'N/A'}
- ISP: ${report.hosting?.isp || 'N/A'}
- Location: ${report.hosting?.city || ''}, ${report.hosting?.country || ''}

## Traffic Rank
${report.traffic?.rank_label || 'N/A'} (#${report.traffic?.tranco_rank || 'N/A'})
`;
    navigator.clipboard.writeText(md.trim());
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('bento-grid-container');
    if (!element || !report) return;
    setGeneratingPDF(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDark ? '#020205' : '#f4f5f8',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width
      const pageHeight = 295; // A4 height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const domainName = report.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      pdf.save(`recon-pulse-report-${domainName}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to export PDF report.");
    } finally {
      setGeneratingPDF(false);
    }
  };


  const isLoading = status === 'pending';
  const isLoadingB = statusB === 'pending';


  // WebGL Background effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = `attribute vec2 a_position; varying vec2 v_texCoord;
      void main(){ gl_Position=vec4(a_position,0.0,1.0); v_texCoord=a_position*0.5+0.5; }`;
    const fs = `precision highp float;
      varying vec2 v_texCoord; uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_mouse;
      float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y);}
      float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p);
        float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
        vec2 u=f*f*(3.0-2.0*f); return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;}
      float fbm(vec2 p){ float v=0.0,a=0.5; vec2 s=vec2(100.0);
        mat2 r=mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
        for(int i=0;i<5;i++){ v+=a*noise(p); p=r*p*2.0+s; a*=0.5;} return v;}
      void main(){
        vec2 uv=v_texCoord;
        vec2 p=(uv*2.0-1.0)*(u_resolution/min(u_resolution.x,u_resolution.y));
        vec2 m=(u_mouse/u_resolution)*2.0-1.0;
        m*=(u_resolution/min(u_resolution.x,u_resolution.y));
        float d=length(p-m); float mi=smoothstep(0.8,0.0,d)*0.15;
        vec2 q=p*0.6+vec2(u_time*0.05,u_time*0.03);
        float n=fbm(q+mi*5.0);
        float n2=fbm(q*1.5+n+u_time*0.02);
        vec3 c1=vec3(0.04,0.05,0.10);
        vec3 c2=vec3(0.20,0.35,0.75);
        vec3 c3=vec3(0.68,0.78,1.0);
        vec3 col=mix(c1,c2,smoothstep(0.2,0.7,n));
        col=mix(col,c3,smoothstep(0.75,0.95,n2)*0.4);
        col*=0.6;
        gl_FragColor=vec4(col,1.0);
      }`;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    const tLoc = gl.getUniformLocation(prog, "u_time");
    const rLoc = gl.getUniformLocation(prog, "u_resolution");
    const mLoc = gl.getUniformLocation(prog, "u_mouse");
    let mx = 0, my = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = window.innerHeight - e.clientY; };
    window.addEventListener("mousemove", onMove);
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("resize", resize); resize();
    let raf = 0;
    const render = (t: number) => {
      gl.uniform1f(tLoc, t * 0.001);
      gl.uniform2f(rLoc, canvas.width, canvas.height);
      gl.uniform2f(mLoc, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Pulse Score Details
  const strokeColor = 
    report?.threat_level === "Critical" ? "#ef4444" : 
    report?.threat_level === "High" ? "#f97316" :    
    report?.threat_level === "Medium" ? "#f59e0b" :  
    "#10b981";                                       

  const scoreVal = report?.summary_score ?? 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scoreVal / 100) * circumference;

  const gaps: string[] = [];
  if (report?.reputation?.malicious_count > 0) gaps.push("Reputation blacklist");
  if (report?.security?.ssl_grade && ["C","D","F"].some(x => report.security.ssl_grade.includes(x))) gaps.push("SSL configs");
  if (report?.observatory?.grade && ["C","D","F"].some(x => report.observatory.grade.includes(x))) gaps.push("Security Headers");
  if (report?.performance?.performance_score !== null && report?.performance?.performance_score !== undefined && report?.performance?.performance_score < 70) gaps.push("Web performance");
  if (report?.email_security && (!report.email_security.spf || !report.email_security.dmarc)) gaps.push("Email SPF/DMARC");

  return (
    <div
      className={`min-h-screen flex antialiased transition-colors duration-300 ${isDark ? 'text-[#e1e2ec] bg-[#020205]' : 'text-slate-800 bg-[#f4f5f8] light-mode'}`}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes rp-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        .rp-shimmer::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);
          animation: rp-shimmer 2.4s infinite; z-index:10; pointer-events:none;
        }
        @keyframes rp-breathe {
          0%,100%{ transform:translateY(-50%) scale(1); box-shadow:0 0 10px rgba(173,198,255,0.3);}
          50%{ transform:translateY(-50%) scale(1.03); box-shadow:0 0 22px rgba(173,198,255,0.6);}
        }
        .rp-breathe { animation: rp-breathe 2.2s ease-in-out infinite; }
        .rp-bento {
          background-color: rgba(10,10,10,0.6);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.1);
          position: relative; overflow: hidden;
          transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.45s ease, border-color 0.3s ease, z-index 0s linear;
          cursor: pointer;
          z-index: 1;
        }
        .rp-bento:focus-visible { outline: 2px solid rgba(173,198,255,0.6); outline-offset: 2px; }
        .rp-bento:hover {
          border-color: rgba(173,198,255,0.45);
          box-shadow: 0 22px 60px rgba(173,198,255,0.22), 0 0 0 1px rgba(173,198,255,0.12) inset;
          transform: translateY(-14px) scale(1.07);
          z-index: 50;
        }
        .rp-bento:active { transform: translateY(-10px) scale(1.04); }

        /* Skeleton loader rules */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .light-mode .skeleton {
          background: linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        /* Light mode overrides */
        .light-mode .rp-bento {
          background-color: rgba(255,255,255,0.75) !important;
          border-color: rgba(0,0,0,0.1) !important;
          color: #1e293b !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
        }
        .light-mode .rp-bento:hover {
          border-color: rgba(0,0,0,0.2) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.06);
        }
        .light-mode nav {
          background-color: rgba(255,255,255,0.85) !important;
          border-color: rgba(0,0,0,0.1) !important;
        }
        .light-mode header {
          background-color: rgba(255,255,255,0.85) !important;
          border-color: rgba(0,0,0,0.1) !important;
        }
        .light-mode input {
          background-color: rgba(255,255,255,0.9) !important;
          border-color: rgba(0,0,0,0.15) !important;
          color: #0f172a !important;
        }
        .light-mode input::placeholder {
          color: #94a3b8 !important;
        }
        .light-mode .text-[#c2c6d6], .light-mode .text-slate-400, .light-mode .text-slate-500 {
          color: #475569 !important;
        }
        .light-mode .text-white, .light-mode .text-slate-300 {
          color: #0f172a !important;
        }
        .light-mode .bg-white\/5 {
          background-color: rgba(0,0,0,0.04) !important;
        }
        .light-mode .border-white\/10 {
          border-color: rgba(0,0,0,0.08) !important;
        }
        .light-mode .border-white\/5 {
          border-color: rgba(0,0,0,0.05) !important;
        }
        .light-mode .rp-modal-content {
          background: rgba(255,255,255,0.95) !important;
          border-color: rgba(0,0,0,0.1) !important;
          color: #1e293b !important;
        }

        .mso { font-family:'Material Symbols Outlined'; font-weight:normal; font-style:normal;
          line-height:1; letter-spacing:normal; text-transform:none; display:inline-block;
          white-space:nowrap; word-wrap:normal; direction:ltr; -webkit-font-feature-settings:'liga'; -webkit-font-smoothing:antialiased; }
        .rp-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size:14px; line-height:20px; }
        .rp-label { font-size:12px; line-height:16px; letter-spacing:0.05em; font-weight:600; }
        .rp-title { font-size:18px; line-height:24px; font-weight:600; }
        .rp-headline { font-size:32px; line-height:40px; letter-spacing:-0.01em; font-weight:600; }
        .rp-display { font-size:48px; line-height:56px; letter-spacing:-0.02em; font-weight:700; }
        ::-webkit-scrollbar { width:8px; height:8px; }
        ::-webkit-scrollbar-track { background: rgba(10,10,10,0.5); }
        ::-webkit-scrollbar-thumb { background:#262626; border-radius:4px; }
        ::-webkit-scrollbar-thumb:hover { background:#424754; }
        .rp-modal-backdrop {
          position:fixed; inset:0; z-index:100;
          background:rgba(0,0,0,0.8); backdrop-filter:blur(4px);
          display:flex; align-items:center; justify-content:center;
          animation: rp-fade-in 0.2s ease;
        }
        .rp-modal-content {
          position:relative; max-width:42rem; width:calc(100% - 2rem);
          border:1px solid rgba(255,255,255,0.1); border-radius:0.5rem;
          background:rgba(10,10,10,0.92); backdrop-filter:blur(24px) saturate(180%);
          max-height:85vh; overflow:hidden; display:flex; flex-direction:column;
          animation: rp-scale-in 0.2s ease;
        }
        @keyframes rp-fade-in { from{opacity:0} to{opacity:1} }
        @keyframes rp-scale-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
      `}</style>

      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />

      {/* Side nav */}
      <nav className="hidden md:flex flex-col h-screen py-6 px-4 fixed left-0 w-64 z-40 border-r border-white/10"
           style={{ backgroundColor: "rgba(10,10,10,0.4)", backdropFilter: "blur(24px) saturate(180%)" }}>
        <div className="mb-8 px-4">
          <h1 className="rp-headline tracking-tighter" style={{ color: PRIMARY, textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
            RECON_PULSE
          </h1>
          <p className="rp-label text-[#c2c6d6] mt-1">Active Session</p>
        </div>
        <button
          onClick={() => { setActiveReportId(null); setUrlInput(''); window.history.pushState(null, '', '/'); }}
          className="mb-8 w-full rp-title py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          style={{ backgroundColor: "rgba(173,198,255,0.9)", color: "#002e6a" }}
        >
          New Scan
        </button>
        <ul className="flex-1 space-y-2">
          {navItems.map((n) => (
            <li key={n.label}>
              <a
                href="#"
                className={
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 " +
                  (n.active
                    ? "border"
                    : "text-[#c2c6d6] hover:bg-white/5 hover:text-[#adc6ff]")
                }
                style={
                  n.active
                    ? {
                        backgroundColor: "rgba(173,198,255,0.2)",
                        color: PRIMARY,
                        borderColor: "rgba(173,198,255,0.3)",
                        boxShadow: "0 0 15px rgba(173,198,255,0.1)",
                      }
                    : undefined
                }
              >
                <span className="mso">{n.icon}</span>
                <span className="rp-title">{n.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col">
        <header
          className="flex items-center justify-between px-4 md:px-10 py-4 w-full sticky top-0 z-30 border-b border-white/10"
          style={{ backgroundColor: "rgba(10,10,10,0.4)", backdropFilter: "blur(24px) saturate(180%)" }}
        >
          <div className="flex items-center gap-4">
            <h2 className="rp-headline md:hidden" style={{ color: PRIMARY }}>Recon Pulse</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="border border-white/10 p-2 rounded-lg bg-white/5 text-slate-300 transition-all hover:bg-white/10 cursor-pointer flex items-center justify-center"
              title="Toggle theme"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`border border-white/10 px-4 py-2 rounded-lg rp-title transition-all hover:bg-white/10 cursor-pointer ${compareMode ? 'bg-blue-600/30 text-blue-400 border-blue-500/50' : 'bg-white/5 text-slate-300'}`}
            >
              {compareMode ? '✓ Compare Mode' : 'Compare'}
            </button>
            {activeReportId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="border border-white/10 px-4 py-2 rounded-lg rp-title transition-all hover:bg-white/10 cursor-pointer"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", color: PRIMARY }}
                >
                  {exported ? '✓ Exported' : 'Export'}
                </button>
                <button
                  onClick={handleShare}
                  className="border border-white/10 px-4 py-2 rounded-lg rp-title transition-all hover:bg-white/10 cursor-pointer"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", color: PRIMARY }}
                >
                  {copied ? '✓ Copied' : 'Share Report'}
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={generatingPDF}
                  className="border border-white/10 px-4 py-2 rounded-lg rp-title transition-all hover:bg-white/10 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", color: PRIMARY }}
                >
                  {generatingPDF ? 'Generating...' : 'Export PDF'}
                </button>
              </div>
            )}


            <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden" style={{ boxShadow: "0 0 10px rgba(173,198,255,0.2)" }}>
              <img alt="Analyst avatar" className="w-full h-full object-cover" src={AVATAR_URL} />
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full flex-1">
          {/* Search */}
          <div className="mb-12 flex flex-col items-center justify-center w-full relative z-20">
            <form onSubmit={handleScan} className="relative w-full max-w-4xl flex flex-col md:flex-row gap-4 items-center mb-4">
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: PRIMARY }}>
                  <span className="mso animate-pulse">radar</span>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="First target domain or IP... (Ctrl+K)"
                  className="w-full border border-white/20 rounded-full py-4 pl-12 pr-6 rp-mono text-[#e1e2ec] focus:outline-none focus:border-blue-500"
                  style={{
                    backgroundColor: "rgba(10,10,10,0.6)",
                    backdropFilter: "blur(24px) saturate(180%)",
                  }}
                />
              </div>
              {compareMode && (
                <div className="relative flex-1 w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: PRIMARY }}>
                    <span className="mso animate-pulse">radar</span>
                  </div>
                  <input
                    type="text"
                    value={urlInputB}
                    onChange={(e) => setUrlInputB(e.target.value)}
                    placeholder="Second target domain or IP..."
                    className="w-full border border-white/20 rounded-full py-4 pl-12 pr-6 rp-mono text-[#e1e2ec] focus:outline-none focus:border-blue-500"
                    style={{
                      backgroundColor: "rgba(10,10,10,0.6)",
                      backdropFilter: "blur(24px) saturate(180%)",
                    }}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="rp-breathe text-white border border-blue-400/30 px-8 py-4 rounded-full rp-title transition-all cursor-pointer disabled:opacity-50 shrink-0"
                style={{ backgroundColor: "rgba(37,99,235,0.9)", backdropFilter: "blur(12px)" }}
              >
                {submitting ? 'Pulse...' : 'Scan'}
              </button>
            </form>

            {historyList.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 max-w-2xl justify-center">
                <span className="text-xs text-slate-400 rp-mono">Recent:</span>
                {historyList.map((h) => (
                  <button
                    key={h.reportId}
                    onClick={() => handleHistoryClick(h.url)}
                    className="text-xs bg-white/5 hover:bg-white/15 border border-white/10 px-3 py-1 rounded-full text-slate-300 transition cursor-pointer rp-mono"
                  >
                    {h.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* Bento grid */}
          {activeReportId && (
            <div
              id="bento-grid-container"
              className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10"
              onClick={(e) => {
                const el = (e.target as HTMLElement).closest("[data-card]") as HTMLElement | null;
                if (el?.dataset.card) setActiveCard(el.dataset.card);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                const el = (e.target as HTMLElement).closest("[data-card]") as HTMLElement | null;
                if (el?.dataset.card) { e.preventDefault(); setActiveCard(el.dataset.card); }
              }}
            >

              {/* Screenshot */}
              <div data-card="screenshot" role="button" tabIndex={0} className={`rp-bento col-span-1 md:col-span-6 rounded-xl p-6 min-h-[400px] flex flex-col ${isLoading ? 'rp-shimmer' : ''}`}>
                <SectionLabel>Screenshot Preview</SectionLabel>
                <div className="flex-1 bg-black/40 rounded-lg border border-white/5 overflow-hidden relative">
                  {!compareMode ? (
                    isLoading ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 rp-mono">Capturing screenshot...</div>
                    ) : report?.screenshot_url ? (
                      <>
                        <img src={report?.screenshot_url} alt="Site screenshot" className="w-full h-full object-cover opacity-90 mix-blend-screen" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#c2c6d6] rp-mono text-xs">No screenshot captured</div>
                    )
                  ) : (
                    <div className="grid grid-cols-2 h-full divide-x divide-white/10">
                      <div className="relative h-full">
                        {isLoading ? (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 rp-mono text-xs">Loading A...</div>
                        ) : report?.screenshot_url ? (
                          <img src={report.screenshot_url} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 rp-mono text-xs">No screenshot A</div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[10px] rp-mono text-slate-300">A: {report?.url?.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      </div>
                      <div className="relative h-full">
                        {isLoadingB ? (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 rp-mono text-xs">Loading B...</div>
                        ) : reportB?.screenshot_url ? (
                          <img src={reportB.screenshot_url} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 rp-mono text-xs">No screenshot B</div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[10px] rp-mono text-slate-300">B: {reportB?.url?.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pulse Score Hero */}
              <div data-card="pulse_score" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-6 rounded-xl p-6 flex flex-col justify-between min-h-[400px]">
                <SectionLabel>Pulse Score Rating</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={5} />
                ) : !compareMode ? (
                  <div className="flex-1 flex flex-col justify-between mt-4">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Left: Progress Circle */}
                      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r={radius} 
                            fill="none" 
                            stroke={strokeColor} 
                            strokeWidth="8"
                            strokeDasharray={circumference} 
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{ 
                              transition: "stroke-dashoffset 1s ease-out",
                              filter: `drop-shadow(0 0 8px ${strokeColor}77)`
                            }} 
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold rp-mono text-white">{scoreVal}</span>
                          <span className="text-[8px] uppercase text-slate-400 font-semibold mt-0.5">Score</span>
                        </div>
                      </div>
                      {/* Right: Narrative */}
                      <div className="flex-1 text-left">
                        <h4 className="text-base font-bold text-white mb-2">
                          Status: <span style={{ color: strokeColor }}>{report?.threat_level || 'Low'} Threat</span>
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed rp-mono">
                          {scoreVal >= 85 
                            ? "This domain has a healthy security posture. No critical gaps were identified during active scanning."
                            : `Gaps detected in: ${gaps.length > 0 ? gaps.join(", ") : "None"}. Remediation recommended to resolve vulnerabilities.`}
                        </p>
                        {(report?.remediation_steps?.length ?? 0) > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveCard('remediation'); }}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-all cursor-pointer"
                            style={{ backgroundColor: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44" }}
                          >
                            <span className="mso text-sm" style={{ fontSize: "14px" }}>build</span>
                            View Remediation Guide ({report?.remediation_steps?.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Score Sparkline History */}
                    {(() => {
                      const sortedHistory = [...scanHistory].reverse();
                      if (sortedHistory.length >= 2) {
                        const pointsList = sortedHistory.map((pt, i) => `${(i / (sortedHistory.length - 1)) * 160},${40 - ((pt.summary_score || 0) / 100) * 35}`);
                        const pathDString = `M ${pointsList.join(' L ')}`;
                        return (
                          <div className="mt-6 border-t border-white/5 pt-4">
                            <div className="text-[10px] text-slate-400 rp-mono mb-2 flex justify-between">
                              <span>Security Posture Trend (Last {sortedHistory.length} scans)</span>
                              <span>Initial: {sortedHistory[0].summary_score} → Latest: {sortedHistory[sortedHistory.length - 1].summary_score}</span>
                            </div>
                            <div className="h-14 w-full">
                              <svg className="w-full h-full overflow-visible" viewBox="0 0 160 45" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>
                                <path 
                                  d={`M 0,45 L ${pointsList.join(' L ')} L 160,45 Z`} 
                                  fill="url(#sparklineGrad)" 
                                />
                                <path 
                                  d={pathDString} 
                                  fill="none" 
                                  stroke={strokeColor} 
                                  strokeWidth="2.5" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  style={{ filter: `drop-shadow(0 0 4px ${strokeColor}aa)` }}
                                />
                              </svg>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-6 border-t border-white/5 pt-4 text-[10px] text-slate-500 rp-mono text-center">
                          Scan history trend line will build dynamically on future reports.
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 h-full items-center mt-auto">
                    <div className="flex flex-col items-center border-r border-white/10 pr-2">
                      <div className="text-[10px] text-slate-400 rp-mono mb-2">A: {report?.url?.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      <div className="text-2xl font-bold rp-mono" style={{ color: strokeColor }}>
                        {report?.summary_score ?? 0} ({report?.threat_level || 'Low'})
                      </div>
                    </div>
                    <div className="flex flex-col items-center pl-2">
                      <div className="text-[10px] text-slate-400 rp-mono mb-2">B: {reportB?.url?.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      <div className="text-2xl font-bold rp-mono" style={{ color: 
                        reportB?.threat_level === "Critical" ? "#ef4444" : 
                        reportB?.threat_level === "High" ? "#f97316" :    
                        reportB?.threat_level === "Medium" ? "#f59e0b" :  
                        "#10b981"
                      }}>
                        {reportB?.summary_score ?? 0} ({reportB?.threat_level || 'Low'})
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SBOM Supply Chain */}
              <div data-card="sbom" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col min-h-[220px]">
                <SectionLabel>Supply Chain</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-sm mt-auto">Checking dependencies...</div>
                ) : !compareMode ? (
                  report?.sbom && report.sbom.total_vulnerabilities > 0 ? (
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold rp-mono" style={{ color: report.sbom.critical_count > 0 ? '#ef4444' : report.sbom.high_count > 0 ? '#f97316' : '#f59e0b' }}>
                          {report.sbom.total_vulnerabilities}
                        </div>
                        <div className="text-xs text-slate-400 rp-mono">known vulns in stack</div>
                      </div>
                      <div className="flex gap-2 text-[10px]">
                        {report.sbom.critical_count > 0 && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">Critical: {report.sbom.critical_count}</span>}
                        {report.sbom.high_count > 0 && <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">High: {report.sbom.high_count}</span>}
                        {report.sbom.medium_count > 0 && <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Medium: {report.sbom.medium_count}</span>}
                      </div>
                    </div>
                  ) : report?.tech_stack?.technologies?.length > 0 ? (
                    <div className="text-[#34d399] rp-mono text-xs mt-auto">✓ No known vulnerabilities in detected stack</div>
                  ) : (
                    <div className="text-[#c2c6d6] rp-mono text-xs mt-auto">No tech stack detected</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-auto rp-mono text-xs">
                    <div>
                      <div className="text-slate-400 mb-1 text-[10px]">A: {report?.url?.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      <div className="text-lg font-bold" style={{ color: (report?.sbom?.critical_count || 0) > 0 ? '#ef4444' : '#34d399' }}>
                        {report?.sbom?.total_vulnerabilities ?? 0} vulns
                      </div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1 text-[10px]">B: {reportB?.url?.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      <div className="text-lg font-bold" style={{ color: (reportB?.sbom?.critical_count || 0) > 0 ? '#ef4444' : '#34d399' }}>
                        {reportB?.sbom?.total_vulnerabilities ?? 0} vulns
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tech stack */}
              <div data-card="tech" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col min-h-[220px]">
                <SectionLabel>Tech Stack</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-sm mt-auto">Detecting technologies...</div>
                ) : !compareMode ? (
                  (report?.tech_stack?.technologies || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {(report?.tech_stack?.technologies || []).slice(0, 6).map((t: string) => (
                        <span
                          key={t}
                          className="border border-white/10 px-3 py-1 rounded-full rp-mono flex items-center gap-2 text-xs"
                          style={{ backgroundColor: "rgba(255,255,255,0.05)", color: PRIMARY }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIMARY, boxShadow: "0 0 5px rgba(173,198,255,0.8)" }} />
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#c2c6d6] rp-mono text-xs mt-auto">No technologies detected.</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-2 rp-mono text-xs h-full">
                    <div>
                      <div className="text-slate-400 mb-1 text-[10px]">A: {report?.url?.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                        {(report?.tech_stack?.technologies || []).slice(0, 4).map((t: string) => (
                          <span key={t} className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1 text-[10px]">B: {reportB?.url?.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                        {(reportB?.tech_stack?.technologies || []).slice(0, 4).map((t: string) => (
                          <span key={t} className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-slate-300 border border-white/5">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Security */}
              <div data-card="security" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <SectionLabelAbs>Security Grade</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-sm mt-8">Analyzing...</div>
                ) : !compareMode ? (
                  <div className="font-bold mt-8 text-[80px] leading-none" style={{ color: "#34d399", textShadow: "0 0 25px rgba(52,211,153,0.5)" }}>
                    {report?.security?.ssl_grade || '?'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 w-full mt-6 text-center">
                    <div className={getSecurityScore(report?.security?.ssl_grade) >= getSecurityScore(reportB?.security?.ssl_grade) ? "text-green-400 font-bold" : "text-slate-400"}>
                      <div className="text-[10px] rp-mono">A</div>
                      <div className="text-4xl mt-2">{report?.security?.ssl_grade || '?'}</div>
                      {getSecurityScore(report?.security?.ssl_grade) >= getSecurityScore(reportB?.security?.ssl_grade) && <div className="text-[10px] mt-1 text-green-500">★ Winner</div>}
                    </div>
                    <div className={`border-l border-white/10 ${getSecurityScore(reportB?.security?.ssl_grade) >= getSecurityScore(report?.security?.ssl_grade) ? "text-green-400 font-bold" : "text-slate-400"}`}>
                      <div className="text-[10px] rp-mono">B</div>
                      <div className="text-4xl mt-2">{reportB?.security?.ssl_grade || '?'}</div>
                      {getSecurityScore(reportB?.security?.ssl_grade) >= getSecurityScore(report?.security?.ssl_grade) && <div className="text-[10px] mt-1 text-green-500">★ Winner</div>}
                    </div>
                  </div>
                )}
              </div>


              {/* Performance */}
              <div data-card="performance" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center">
                <SectionLabelAbs>Performance</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-sm mt-8">Calculating...</div>
                ) : !compareMode ? (
                  <div className="relative w-32 h-32 mt-8 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke={PRIMARY} strokeWidth="10"
                        strokeDasharray="282.7" strokeDashoffset={282.7 - ((report?.performance?.performance_score || 0) / 100) * 282.7}
                        style={{ filter: "drop-shadow(0 0 12px rgba(173,198,255,0.6))" }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rp-headline font-bold">
                        {report?.performance?.performance_score !== null ? `${report?.performance?.performance_score}%` : '?'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 w-full mt-6 text-center">
                    <div className={(report?.performance?.performance_score || 0) >= (reportB?.performance?.performance_score || 0) ? "text-green-400 font-bold" : "text-slate-400"}>
                      <div className="text-[10px] rp-mono">A</div>
                      <div className="text-3xl mt-2">{report?.performance?.performance_score !== null ? `${report.performance.performance_score}%` : '?'}</div>
                      {(report?.performance?.performance_score || 0) >= (reportB?.performance?.performance_score || 0) && <div className="text-[10px] mt-1 text-green-500">★ Winner</div>}
                    </div>
                    <div className={`border-l border-white/10 ${(reportB?.performance?.performance_score || 0) >= (report?.performance?.performance_score || 0) ? "text-green-400 font-bold" : "text-slate-400"}`}>
                      <div className="text-[10px] rp-mono">B</div>
                      <div className="text-3xl mt-2">{reportB?.performance?.performance_score !== null ? `${reportB.performance.performance_score}%` : '?'}</div>
                      {(reportB?.performance?.performance_score || 0) >= (report?.performance?.performance_score || 0) && <div className="text-[10px] mt-1 text-green-500">★ Winner</div>}
                    </div>
                  </div>
                )}
              </div>

              {/* Hosting */}
              <div data-card="hosting" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-6 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Hosting Info</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white">
                        {report?.hosting?.provider_name || report?.hosting?.isp || 'Unknown'}
                      </span>
                      {report?.hosting?.provider_name && report?.hosting?.provider_name !== "Other" && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          report.hosting.provider_name.includes("AWS") || report.hosting.provider_name.includes("Amazon") ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                          report.hosting.provider_name.includes("Google") || report.hosting.provider_name.includes("Azure") || report.hosting.provider_name.includes("Microsoft") ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                          report.hosting.provider_name.includes("Cloudflare") ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                          "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}>
                          {report.hosting.provider_name.includes("AWS") || report.hosting.provider_name.includes("Amazon") ? "AWS" :
                           report.hosting.provider_name.includes("Google") ? "GCP" :
                           report.hosting.provider_name.includes("Azure") ? "Azure" :
                           report.hosting.provider_name.includes("Cloudflare") ? "Cloudflare" : "Other"}
                        </span>
                      )}
                    </div>
                    <KV k="Location" v={`${report?.hosting?.city || ''}, ${report?.hosting?.country || 'Unknown'}`} />
                    <KV k="IP Address" v={report?.hosting?.ip || 'Unknown'} vClass="text-[#adc6ff]" last />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs rp-mono">
                    <div>
                      <div className="text-slate-400 mb-1 text-[10px]">A Hosting</div>
                      <div className="font-semibold text-white truncate">{report?.hosting?.provider_name || report?.hosting?.isp || 'Unknown'}</div>
                      <KV k="IP" v={report?.hosting?.ip || 'Unknown'} last />
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1 text-[10px]">B Hosting</div>
                      <div className="font-semibold text-white truncate">{reportB?.hosting?.provider_name || reportB?.hosting?.isp || 'Unknown'}</div>
                      <KV k="IP" v={reportB?.hosting?.ip || 'Unknown'} last />
                    </div>
                  </div>
                )}
              </div>


              {/* Domain Age */}
              <div data-card="domain" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Domain Age</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Parsing history...</div>
                ) : !compareMode ? (
                  <>
                    <div className="rp-headline font-light">
                      {report?.domain?.age_days !== null && report?.domain?.age_days !== undefined ? (
                        <>
                          {Math.floor(report?.domain?.age_days / 365)}<span className="text-[#c2c6d6] text-lg">y</span> {Math.floor((report?.domain?.age_days % 365) / 30)}<span className="text-[#c2c6d6] text-lg">m</span>
                        </>
                      ) : 'Unknown'}
                    </div>
                    <div className="rp-mono text-[#c2c6d6] text-xs mt-2 pt-2 border-t border-white/10">
                      Created: {report?.domain?.created || 'Unknown'}
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4 rp-mono text-xs mt-auto">
                    <div>
                      <div className="text-slate-400">A</div>
                      <div className="font-semibold text-white mt-1 text-lg">
                        {report?.domain?.age_days !== null && report?.domain?.age_days !== undefined ? `${Math.floor(report.domain.age_days / 365)}y` : 'N/A'}
                      </div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400">B</div>
                      <div className="font-semibold text-white mt-1 text-lg">
                        {reportB?.domain?.age_days !== null && reportB?.domain?.age_days !== undefined ? `${Math.floor(reportB.domain.age_days / 365)}y` : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* News */}
              <div data-card="news" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-5 rounded-xl p-6 flex flex-col min-h-[220px]">
                <SectionLabel>Recent Mentions</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-auto">Searching news...</div>
                ) : !compareMode ? (
                  (report?.news || []).length > 0 ? (
                    <ul className="space-y-4 mt-auto">
                      {(report?.news || []).slice(0, 2).map((n: any, idx: number) => (
                        <li key={idx} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                          <p className="text-sm leading-6 text-[#e1e2ec] line-clamp-1">{n?.title}</p>
                          <span className="rp-mono text-xs" style={{ color: PRIMARY }}>{n?.source} · {n?.date || 'recent'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[#c2c6d6] rp-mono text-xs mt-auto">No news mentions found</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1 text-[10px]">A Mentions</div>
                      <ul className="space-y-2">
                        {(report?.news || []).slice(0, 2).map((n: any, idx: number) => (
                          <li key={idx} className="truncate text-slate-300">{n.title}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1 text-[10px]">B Mentions</div>
                      <ul className="space-y-2">
                        {(reportB?.news || []).slice(0, 2).map((n: any, idx: number) => (
                          <li key={idx} className="truncate text-slate-300">{n.title}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* GitHub */}
              <div data-card="github" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-center min-h-[180px]">
                <SectionLabelAbs>GitHub Activity</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-8">Checking...</div>
                ) : !compareMode ? (
                  report?.github?.exists ? (
                    <div>
                      <div className="flex gap-8 mt-8">
                        {[
                          { icon: "star", label: "Repos", val: report?.github?.repos || 0 },
                          { icon: "group", label: "Followers", val: report?.github?.followers || 0 },
                        ].map((s) => (
                          <div key={s.label}>
                            <div className="flex items-center gap-2 text-[#c2c6d6] mb-1">
                              <span className="mso text-sm" style={{ color: "rgba(173,198,255,0.7)" }}>{s.icon}</span>
                              <span className="rp-label">{s.label}</span>
                            </div>
                            <div className="rp-headline">{s.val}</div>
                          </div>
                        ))}
                      </div>
                      <a 
                        href={`https://github.com/${report?.url?.replace(/^https?:\/\/(www\.)?/, '').split('.')[0] || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 text-xs text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        View Profile ↗
                      </a>
                    </div>
                  ) : (
                    <div className="text-[#c2c6d6] rp-mono text-xs mt-8">No public profile found</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-8 rp-mono text-xs text-center">
                    <div>
                      <div className="text-slate-400">A</div>
                      <div className="text-lg font-bold text-white mt-1">{report?.github?.exists ? `${report.github.repos} repos` : 'No Profile'}</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400">B</div>
                      <div className="text-lg font-bold text-white mt-1">{reportB?.github?.exists ? `${reportB.github.repos} repos` : 'No Profile'}</div>
                    </div>
                  </div>
                )}
              </div>


              {/* Palette */}
              <div data-card="palette" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col min-h-[220px]">
                <SectionLabel>Extracted Palette</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  (extractedColors?.palette && extractedColors.palette.length > 0) ? (
                    <div className="flex gap-4 mt-auto">
                      {extractedColors.palette.slice(0, 5).map((c: string) => (
                        <div key={c} className="flex-1 flex flex-col items-center">
                          <div 
                            className="w-full h-12 rounded-lg border border-white/20 relative group overflow-hidden cursor-pointer"
                            style={{ backgroundColor: c, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(c);
                              setCopiedHex(c);
                              setTimeout(() => setCopiedHex(null), 2000);
                            }}
                          >
                            {copiedHex === c && (
                              <div className="absolute inset-0 bg-green-600/90 flex items-center justify-center text-white text-[10px] font-bold rp-mono">
                                Copied!
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 select-all rp-mono">{c}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#c2c6d6] rp-mono text-xs mt-auto">No palette available</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div>
                      <div className="text-[10px] text-slate-400 rp-mono mb-1">A Palette</div>
                      <div className="flex gap-1 h-10">
                        {(extractedColors?.palette || []).slice(0, 3).map((c: string) => (
                          <div key={c} className="flex-1 rounded" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-[10px] text-slate-400 rp-mono mb-1">B Palette</div>
                      <div className="flex gap-1 h-10">
                        {(extractedColorsB?.palette || []).slice(0, 3).map((c: string) => (
                          <div key={c} className="flex-1 rounded" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Carbon */}
              <div data-card="carbon" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
                <SectionLabelAbs>Carbon Impact</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-6">Analyzing eco...</div>
                ) : !compareMode ? (
                  <div className="mt-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 border"
                         style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(16,185,129,0.3)", boxShadow: "0 0 20px rgba(16,185,129,0.15)" }}>
                      <span className="mso text-3xl" style={{ color: "#34d399" }}>eco</span>
                    </div>
                    <span className="rp-title" style={{ color: "#34d399" }}>{report?.carbon?.rating || 'Low'}</span>
                    <span className="rp-mono text-[#c2c6d6] text-xs mt-1">
                      {report?.carbon?.grams_per_view ? `${report?.carbon?.grams_per_view}g CO2` : '0.12g CO2'}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 w-full mt-6 text-center">
                    <div className={(report?.carbon?.grams_per_view || 99) <= (reportB?.carbon?.grams_per_view || 99) ? "text-green-400 font-bold" : "text-slate-400"}>
                      <div className="text-[10px] rp-mono">A</div>
                      <div className="text-lg mt-1">{report?.carbon?.rating || 'Low'}</div>
                      <div className="text-[10px] text-slate-400">{report?.carbon?.grams_per_view ? `${report.carbon.grams_per_view}g` : 'N/A'}</div>
                      {(report?.carbon?.grams_per_view || 99) <= (reportB?.carbon?.grams_per_view || 99) && <div className="text-[10px] mt-1 text-green-500">★ Winner</div>}
                    </div>
                    <div className={`border-l border-white/10 ${(reportB?.carbon?.grams_per_view || 99) <= (report?.carbon?.grams_per_view || 99) ? "text-green-400 font-bold" : "text-slate-400"}`}>
                      <div className="text-[10px] rp-mono">B</div>
                      <div className="text-lg mt-1">{reportB?.carbon?.rating || 'Low'}</div>
                      <div className="text-[10px] text-slate-400">{reportB?.carbon?.grams_per_view ? `${reportB.carbon.grams_per_view}g` : 'N/A'}</div>
                      {(reportB?.carbon?.grams_per_view || 99) <= (report?.carbon?.grams_per_view || 99) && <div className="text-[10px] mt-1 text-green-500">★ Winner</div>}
                    </div>
                  </div>
                )}
              </div>

              {/* DNS */}
              <GlassCard cardKey="dns" label="DNS Records" span={5} loading={isLoading}>
                {!compareMode ? (
                  report?.dns_records?.A ? (
                    <>
                      <DnsRow t="A" v={report?.dns_records?.A?.[0]} />
                      {report?.dns_records?.AAAA?.[0] && <DnsRow t="AAAA" v={report?.dns_records?.AAAA?.[0]} />}
                      {report?.dns_records?.MX?.[0] && <DnsRow t="MX" v={report?.dns_records?.MX?.[0]} last />}
                    </>
                  ) : (
                    <div className="text-[#c2c6d6] text-xs rp-mono">No DNS resolved</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs rp-mono">
                    <div>
                      <div className="text-slate-400 mb-1 text-[10px]">A DNS</div>
                      <DnsRow t="A" v={report?.dns_records?.A?.[0]} last />
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1 text-[10px]">B DNS</div>
                      <DnsRow t="A" v={reportB?.dns_records?.A?.[0]} last />
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Traffic */}
              <div data-card="traffic" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-center min-h-[180px]">
                <SectionLabelAbs>Global Traffic Rank</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-8">Loading rank...</div>
                ) : !compareMode ? (
                  <>
                    <div className="mt-8 flex items-end gap-3">
                      <span className="rp-display font-bold">
                        {report?.traffic?.tranco_rank ? `#${report?.traffic?.tranco_rank.toLocaleString()}` : '#N/A'}
                      </span>
                      <span className="rp-mono flex items-center mb-2" style={{ color: "#34d399", textShadow: "0 0 8px rgba(16,185,129,0.6)" }}>
                        <span className="mso text-sm mr-1">trending_up</span> Live
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 mt-4 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full w-3/4" style={{ backgroundColor: PRIMARY, boxShadow: "0 0 12px rgba(173,198,255,0.9)" }} />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 w-full mt-8 text-center text-xs rp-mono">
                    <div>
                      <div className="text-slate-400">A Rank</div>
                      <div className="text-md font-bold text-white mt-1">
                        {report?.traffic?.tranco_rank ? `#${report.traffic.tranco_rank.toLocaleString()}` : 'N/A'}
                      </div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400">B Rank</div>
                      <div className="text-md font-bold text-white mt-1">
                        {reportB?.traffic?.tranco_rank ? `#${reportB.traffic.tranco_rank.toLocaleString()}` : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
              </div>


              {/* Redirect Chain */}
              <div data-card="redirect_chain" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">

                <SectionLabel>Redirect Chain</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Tracking redirects...</div>
                ) : !compareMode ? (
                  (report?.redirect_chain?.hops || []).length > 0 ? (
                    <div className="space-y-1 mt-2 rp-mono text-xs">
                      {(report.redirect_chain.hops || []).map((hop: any, idx: number) => {
                        const isSuccess = hop.status === 200;
                        const isRedirect = hop.status >= 300 && hop.status < 400;
                        const statusColor = isSuccess ? 'text-green-400' : isRedirect ? 'text-orange-400' : 'text-red-400';
                        return (
                          <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-1">
                            <span className="truncate max-w-[70%]">{hop.url.replace(/^https?:\/\//, '')}</span>
                            <span className={statusColor}>{hop.status} {isSuccess && '✓'}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[#c2c6d6] rp-mono text-xs mt-auto">No redirect history</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Redirects</div>
                      <div className="text-slate-300">{(report?.redirect_chain?.hops || []).length} hops</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Redirects</div>
                      <div className="text-slate-300">{(reportB?.redirect_chain?.hops || []).length} hops</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Security */}
              <div data-card="email_security" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Email Security</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Scanning DNS...</div>
                ) : !compareMode ? (
                  <div className="space-y-2 mt-2 rp-mono text-sm">
                    <div className="flex justify-between">
                      <span>SPF</span>
                      <span className={report?.email_security?.spf ? "text-green-400" : "text-red-400"}>
                        {report?.email_security?.spf ? "✓ Pass" : "✗ Fail"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>DMARC</span>
                      <span className={report?.email_security?.dmarc ? "text-green-400" : "text-red-400"}>
                        {report?.email_security?.dmarc ? "✓ Pass" : "✗ Fail"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>DKIM</span>
                      <span className={report?.email_security?.dkim ? "text-green-400" : "text-red-400"}>
                        {report?.email_security?.dkim ? "✓ Pass" : "✗ Fail"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Security</div>
                      <div>SPF: {report?.email_security?.spf ? "✓ Pass" : "✗ Fail"}</div>
                      <div>DMARC: {report?.email_security?.dmarc ? "✓ Pass" : "✗ Fail"}</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Security</div>
                      <div>SPF: {reportB?.email_security?.spf ? "✓ Pass" : "✗ Fail"}</div>
                      <div>DMARC: {reportB?.email_security?.dmarc ? "✓ Pass" : "✗ Fail"}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Presence */}
              <div data-card="social" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Social Presence</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Looking up brand profiles...</div>
                ) : !compareMode ? (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs rp-mono">
                    {[
                      { icon: "🐦", name: "Twitter", val: report?.social?.twitter, url: `https://twitter.com/${report?.url?.replace(/^https?:\/\/(www\.)?/, '').split('.')[0] || ''}` },
                      { icon: "💼", name: "LinkedIn", val: report?.social?.linkedin, url: `https://linkedin.com/company/${report?.url?.replace(/^https?:\/\/(www\.)?/, '').split('.')[0] || ''}` },
                      { icon: "🐙", name: "GitHub", val: report?.social?.github, url: `https://github.com/${report?.url?.replace(/^https?:\/\/(www\.)?/, '').split('.')[0] || ''}` },
                      { icon: "📸", name: "Instagram", val: report?.social?.instagram, url: `https://instagram.com/${report?.url?.replace(/^https?:\/\/(www\.)?/, '').split('.')[0] || ''}` },
                      { icon: "📘", name: "Facebook", val: report?.social?.facebook, url: `https://facebook.com/${report?.url?.replace(/^https?:\/\/(www\.)?/, '').split('.')[0] || ''}` },
                      { icon: "▶️", name: "YouTube", val: report?.social?.youtube, url: `https://youtube.com/@{report?.url?.replace(/^https?:\/\/(www\.)?/, '').split('.')[0] || ''}` },
                    ].map((p) => (
                      p.val ? (
                        <a 
                          key={p.name} 
                          href={p.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 p-1.5 rounded border border-blue-400/30 bg-blue-400/10 hover:bg-blue-400/20 text-white transition-colors cursor-pointer"
                        >
                          <span>{p.icon}</span>
                          <span className="truncate hover:underline">{p.name}</span>
                          <span className="ml-auto text-blue-400">↗</span>
                        </a>
                      ) : (
                        <div key={p.name} className="flex items-center gap-1 p-1.5 rounded border border-white/5 bg-white/5 text-slate-500">
                          <span>{p.icon}</span>
                          <span className="truncate">{p.name}</span>
                          <span className="ml-auto">✗</span>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Socials</div>
                      <div>Present: {[report?.social?.twitter, report?.social?.linkedin, report?.social?.github].filter(Boolean).length}/3</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Socials</div>
                      <div>Present: {[reportB?.social?.twitter, reportB?.social?.linkedin, reportB?.social?.github].filter(Boolean).length}/3</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trackers */}
              <div data-card="trackers" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Trackers & Cookies</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Scanning headers...</div>
                ) : !compareMode ? (
                  (report?.tech_stack?.trackers || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-auto max-h-[100px] overflow-y-auto">
                      {(report.tech_stack.trackers || []).map((t: string) => (
                        <span key={t} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] rp-mono text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 rp-mono text-xs mt-auto">No trackers detected.</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Trackers</div>
                      <div className="text-slate-300">{(report?.tech_stack?.trackers || []).length} found</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Trackers</div>
                      <div className="text-slate-300">{(reportB?.tech_stack?.trackers || []).length} found</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Website Age */}
              <div data-card="wayback" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Website Age</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Checking archive...</div>
                ) : !compareMode ? (
                  <div>
                    <div className="text-sm rp-mono text-slate-300">
                      First seen: <span className="font-semibold text-white">{report?.wayback?.first_seen || 'N/A'}</span>
                    </div>
                    {report?.wayback?.first_seen && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 rp-mono">
                          <span>1995</span>
                          <span>Today</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5 flex">
                          <div 
                            className="h-full bg-blue-400" 
                            style={{ 
                              width: `${Math.max(5, Math.min(100, ((new Date().getFullYear() - parseInt(report.wayback.first_seen)) / (new Date().getFullYear() - 1995)) * 100))}%` 
                            }} 
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 rp-mono text-right">
                          {new Date().getFullYear() - parseInt(report.wayback.first_seen)} years online
                        </div>
                      </div>
                    )}
                    {report?.wayback?.latest_snapshot && (
                      <a 
                        href={report.wayback.latest_snapshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 text-xs text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        View Archive Snapshot ↗
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Age</div>
                      <div className="text-white font-semibold">{report?.wayback?.first_seen || 'N/A'}</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Age</div>
                      <div className="text-white font-semibold">{reportB?.wayback?.first_seen || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fonts */}
              <div data-card="fonts" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Google Fonts</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  (report?.tech_stack?.fonts || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-auto max-h-[100px] overflow-y-auto">
                      {(report.tech_stack.fonts || []).map((f: string) => (
                        <span key={f} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] rp-mono text-slate-300">
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 rp-mono text-xs mt-auto">No custom web fonts detected.</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Fonts</div>
                      <div className="text-slate-300">{(report?.tech_stack?.fonts || []).length} found</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Fonts</div>
                      <div className="text-slate-300">{(reportB?.tech_stack?.fonts || []).length} found</div>
                    </div>
                  </div>
                )}
              </div>

              {/* HTTP Version */}
              <div data-card="http_version" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>HTTP Protocol Support</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  <div className="space-y-1 mt-2 text-xs rp-mono">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span>HTTP/1.1</span>
                      <span className="text-green-400 font-semibold">✓ Yes</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span>HTTP/2</span>
                      <span className={report?.http_version?.http2 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                        {report?.http_version?.http2 ? "✓ Yes" : "✗ No"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-1">
                      <span>HTTP/3 (QUIC)</span>
                      <span className={report?.http_version?.http3 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                        {report?.http_version?.http3 ? "✓ Yes" : "✗ No"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A HTTP Support</div>
                      <div className="text-slate-300">HTTP/2: {report?.http_version?.http2 ? '✓' : '✗'}</div>
                      <div className="text-slate-300">HTTP/3: {report?.http_version?.http3 ? '✓' : '✗'}</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B HTTP Support</div>
                      <div className="text-slate-300">HTTP/2: {reportB?.http_version?.http2 ? '✓' : '✗'}</div>
                      <div className="text-slate-300">HTTP/3: {reportB?.http_version?.http3 ? '✓' : '✗'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Robots.txt */}
              <div data-card="robots" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Robots & Sitemap</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  <div className="mt-2">
                    <pre className="text-[10px] rp-mono text-slate-300 bg-black/30 p-2 rounded max-h-[80px] overflow-hidden whitespace-pre-wrap">
                      {report?.robots?.robots_txt || 'No robots.txt detected'}
                    </pre>
                    {report?.robots?.robots_txt && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveCard('robots'); }}
                        className="mt-2 text-[10px] text-blue-400 hover:underline cursor-pointer"
                      >
                        View Full Robots.txt
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Robots</div>
                      <div className="text-slate-300">{report?.robots?.robots_txt ? 'Available' : 'N/A'}</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Robots</div>
                      <div className="text-slate-300">{reportB?.robots?.robots_txt ? 'Available' : 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* BGP Routing */}
              <div data-card="bgp" onClick={() => setActiveCard('bgp')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>BGP Routing Details</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  <div className="space-y-1 mt-2 text-xs rp-mono">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>IPv4 Prefixes</span>
                      <span className="text-white font-semibold">{report?.bgp?.prefixes_ipv4 ?? 0}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>IPv6 Prefixes</span>
                      <span className="text-white font-semibold">{report?.bgp?.prefixes_ipv6 ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peers Count</span>
                      <span className="text-white font-semibold">{report?.bgp?.peers_count ?? 0}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A BGP Peers</div>
                      <div className="text-white">{report?.bgp?.peers_count ?? 0} peers</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B BGP Peers</div>
                      <div className="text-white">{reportB?.bgp?.peers_count ?? 0} peers</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subdomain Inventory */}
              <div data-card="subdomains" onClick={() => setActiveCard('subdomains')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Subdomain Inventory</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  (report?.subdomains?.subdomains || []).length > 0 ? (
                    <div>
                      <div className="flex flex-wrap gap-1.5 mt-auto max-h-[80px] overflow-y-auto">
                        {(report.subdomains.subdomains || []).slice(0, 4).map((sub: string) => (
                          <span key={sub} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] rp-mono text-slate-300 truncate max-w-full">
                            {sub.split('.')[0]}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 rp-mono text-right">
                        {report?.subdomains?.total_count} total detected
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 rp-mono text-xs mt-auto">No subdomains detected</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Subdomains</div>
                      <div className="text-white">{report?.subdomains?.total_count ?? 0} found</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Subdomains</div>
                      <div className="text-white">{reportB?.subdomains?.total_count ?? 0} found</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Shadow IT Discovery */}
              {report?.shadow_subdomains && report.shadow_subdomains.length > 0 && (
                <div data-card="shadow_it" onClick={() => setActiveCard('shadow_it')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                  <SectionLabel>Shadow IT Discovery</SectionLabel>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl font-bold rp-mono text-orange-400">{report.shadow_subdomains.length}</span>
                      <span className="text-xs text-slate-400 rp-mono">unauthorized hosts</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto">
                      {report.shadow_subdomains.slice(0, 5).map((s: any) => (
                        <span key={s.subdomain} className="bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded text-[10px] rp-mono text-orange-300 truncate max-w-full">
                          {s.subdomain.split('.')[0]}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 rp-mono text-right">
                      {report.shadow_subdomains.filter((s: any) => s.classification === 'Staging' || s.classification === 'Development').length} non-production
                    </div>
                  </div>
                </div>
              )}

              {/* Reputation Engine */}
              <div data-card="reputation" onClick={() => setActiveCard('reputation')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Reputation Engine</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  <div className="mt-2 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        report?.reputation?.status === "Malicious" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        report?.reputation?.status === "Suspicious" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                        "bg-green-500/20 text-green-400 border border-green-500/30"
                      }`}>
                        {report?.reputation?.status || "Clean"}
                      </span>
                      <span className="text-[10px] text-slate-400 rp-mono">
                        {report?.reputation?.malicious_count}/{report?.reputation?.total_scanners || 70} detections
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 rp-mono mt-2 block">
                      * Configure VIRUSTOTAL_API_KEY for sandbox audits
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Reputation</div>
                      <div className="text-white font-semibold">{report?.reputation?.status || "Clean"}</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Reputation</div>
                      <div className="text-white font-semibold">{reportB?.reputation?.status || "Clean"}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mozilla Observatory */}
              <div data-card="observatory" onClick={() => setActiveCard('observatory')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Mozilla Observatory</SectionLabel>
                {isLoading ? (
                  <SkeletonLoader lines={3} />
                ) : !compareMode ? (
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-sm font-semibold rp-mono text-slate-300">
                        Score: <span className="text-white">{report?.observatory?.score ?? 'N/A'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 rp-mono">
                        Passed: {report?.observatory?.tests_passed ?? 0} | Failed: {report?.observatory?.tests_failed ?? 0}
                      </div>
                    </div>
                    {report?.observatory?.grade && (
                      <div className="text-3xl font-extrabold text-green-400 border border-green-500/20 px-3 py-1 rounded bg-green-500/10">
                        {report.observatory.grade}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-[10px] rp-mono mt-auto">
                    <div>
                      <div className="text-slate-400 mb-1">A Grade</div>
                      <div className="text-white font-semibold">{report?.observatory?.grade || 'N/A'}</div>
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <div className="text-slate-400 mb-1">B Grade</div>
                      <div className="text-white font-semibold">{reportB?.observatory?.grade || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Shodan — Open Ports & Services */}
              {report?.shodan && (
                <div data-card="shodan" onClick={() => setActiveCard('shodan')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                  <SectionLabel>Shodan Exposure</SectionLabel>
                  <div className="mt-2">
                    <div className="text-xs rp-mono text-slate-400 mb-1">{report.shodan.ports?.length || 0} open ports</div>
                    <div className="flex flex-wrap gap-1">
                      {(report.shodan.ports || []).slice(0, 6).map((p: number) => (
                        <span key={p} className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded text-[10px] rp-mono">{p}</span>
                      ))}
                    </div>
                    {report.shodan.vulns?.length > 0 && (
                      <div className="text-red-400 text-[10px] rp-mono mt-2">{report.shodan.vulns.length} known vulns</div>
                    )}
                  </div>
                </div>
              )}

              {/* SSL Labs Grade */}
              {report?.ssllabs && (
                <div data-card="ssllabs" onClick={() => setActiveCard('ssllabs')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                  <SectionLabel>SSL Labs Grade</SectionLabel>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-3xl font-extrabold" style={{ color: report.ssllabs.grade?.startsWith('A') ? '#34d399' : report.ssllabs.grade?.startsWith('B') ? '#f59e0b' : '#ef4444' }}>
                      {report.ssllabs.grade || 'N/A'}
                    </span>
                    <div className="text-right text-[10px] text-slate-400 rp-mono">
                      {report.ssllabs.protocol && <div>{report.ssllabs.protocol}</div>}
                      {report.ssllabs.has_warnings && <div className="text-yellow-400">⚠ Warnings</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* SecurityTrails — Historical DNS */}
              {report?.securitytrails && (
                <div data-card="securitytrails" onClick={() => setActiveCard('securitytrails')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                  <SectionLabel>SecurityTrails DNS</SectionLabel>
                  <div className="mt-2 text-xs rp-mono text-slate-300">
                    <div>{report.securitytrails.total_subdomains || 0} discovered subdomains</div>
                    <div className="text-slate-500 text-[10px] mt-1">{report.securitytrails.dns_history?.length || 0} historical DNS records</div>
                  </div>
                </div>
              )}

              {/* Compliance Dashboard with Progress Bar */}
              {report?.compliance_soc2 && (
                <div data-card="compliance" onClick={() => setActiveCard('compliance')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                  <SectionLabel>Compliance Progress</SectionLabel>
                  {(() => {
                    const soc2Pct = Math.round(report.compliance_soc2.passed / report.compliance_soc2.total_controls * 100);
                    const nistPct = Math.round(report.compliance_nist.passed / report.compliance_nist.total_controls * 100);
                    const combined = Math.round((soc2Pct + nistPct) / 2);
                    const barColor = combined >= 80 ? '#34d399' : combined >= 50 ? '#f59e0b' : '#ef4444';
                    return (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400 rp-mono">Overall Compliance</span>
                          <span className="font-semibold" style={{ color: barColor }}>{combined}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${combined}%`, backgroundColor: barColor }} />
                        </div>
                        <div className="flex gap-2 text-[10px]">
                          <div className="flex-1 border border-white/10 rounded p-2 bg-white/5">
                            <div className="text-slate-400 rp-mono">SOC2</div>
                            <div className="font-semibold text-white">{report.compliance_soc2.passed}/{report.compliance_soc2.total_controls}</div>
                            <div className="h-1 rounded bg-white/10 mt-1 overflow-hidden">
                              <div className="h-full rounded bg-green-400" style={{ width: `${soc2Pct}%` }} />
                            </div>
                          </div>
                          <div className="flex-1 border border-white/10 rounded p-2 bg-white/5">
                            <div className="text-slate-400 rp-mono">NIST CSF</div>
                            <div className="font-semibold text-white">{report.compliance_nist.passed}/{report.compliance_nist.total_controls}</div>
                            <div className="h-1 rounded bg-white/10 mt-1 overflow-hidden">
                              <div className="h-full rounded bg-indigo-400" style={{ width: `${nistPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Dark Web Intel */}
              {report?.darkweb && (
                <div data-card="darkweb" onClick={() => setActiveCard('darkweb')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                  <SectionLabel>Dark Web Intel</SectionLabel>
                  <div className="mt-2 text-xs rp-mono">
                    <div className="flex justify-between border-b border-white/5 pb-1 mb-1">
                      <span className="text-slate-400">Breaches</span>
                      <span className={report.darkweb.breaches?.length > 0 ? 'text-red-400 font-semibold' : 'text-green-400'}>{report.darkweb.breaches?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Leaked Subdomains</span>
                      <span className={report.darkweb.leaked_subdomains?.length > 0 ? 'text-red-400 font-semibold' : 'text-green-400'}>{report.darkweb.leaked_subdomains?.length || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Attack Path Visualization */}
              {report?.attack_path && report.attack_path.length > 1 && (
                <div data-card="attack_path" onClick={() => setActiveCard('attack_path')} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-6 rounded-xl p-6 flex flex-col min-h-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <SectionLabel>Attack Surface Graph</SectionLabel>
                      <span className="text-[10px] text-slate-400 rp-mono">{report.attack_path.length} nodes</span>
                    </div>
                    <div className="flex-1 min-h-[140px]">
                      <AttackPathView nodes={report.attack_path} />
                    </div>
                  </div>
                )}

                {/* Remediation Guide Card */}
                {(report?.remediation_steps?.length ?? 0) > 0 && (
                  <div
                    data-card="remediation"
                    role="button"
                    tabIndex={0}
                    className="rp-bento col-span-1 md:col-span-9 rounded-xl p-6 flex flex-col min-h-[200px]"
                    style={{ border: "1px solid rgba(245,158,11,0.2)", boxShadow: "0 0 32px rgba(245,158,11,0.06)" }}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center border"
                          style={{ backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" }}
                        >
                          <span className="mso text-base" style={{ color: "#f59e0b" }}>build</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">Remediation Guide</div>
                          <div className="text-[10px] text-slate-400 rp-mono">
                            {report.remediation_steps.length} patch{report.remediation_steps.length !== 1 ? "es" : ""} auto-generated · click any step to copy config
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveCard('remediation'); }}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer hover:scale-105"
                        style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
                      >
                        Open Patch Guide →
                      </button>
                    </div>

                    {/* Step pills grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {report.remediation_steps.map((step: any, idx: number) => {
                        const isSecurity = step.title?.toLowerCase().includes("header");
                        const isEmail    = step.title?.toLowerCase().includes("email") || step.title?.toLowerCase().includes("spf") || step.title?.toLowerCase().includes("dmarc");
                        const isTLS      = step.title?.toLowerCase().includes("ssl") || step.title?.toLowerCase().includes("tls");
                        const isHTTPS    = step.title?.toLowerCase().includes("https") || step.title?.toLowerCase().includes("redirect");
                        const isHTTP2    = step.title?.toLowerCase().includes("http/2");
                        const color = isTLS ? "#ef4444" : isEmail ? "#8b5cf6" : isSecurity ? "#f97316" : isHTTPS ? "#3b82f6" : isHTTP2 ? "#10b981" : "#f59e0b";
                        const icon  = isTLS ? "lock" : isEmail ? "mail" : isSecurity ? "shield" : isHTTPS ? "http" : isHTTP2 ? "speed" : "build";
                        const mitre = step.mitre_attack || [];

                        return (
                          <div
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setActiveCard('remediation'); }}
                            className="group rounded-lg p-3 border cursor-pointer transition-all hover:scale-[1.02]"
                            style={{ backgroundColor: `${color}0d`, borderColor: `${color}30` }}
                          >
                            <div className="flex items-start gap-2">
                              <span className="mso text-sm mt-0.5 shrink-0" style={{ color }}>{icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-white leading-snug truncate">{step.title}</div>
                                <div className="text-[10px] text-slate-400 rp-mono mt-0.5 leading-relaxed line-clamp-2">{step.description}</div>
                              </div>
                            </div>
                            {mitre.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {mitre.slice(0, 2).map((m: any) => (
                                  <span
                                    key={m.technique_id}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold rp-mono"
                                    style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
                                  >
                                    {m.technique_id}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Integrations */}
              <div data-card="integrations" onClick={() => setShowIntegrations(true)} role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col justify-between min-h-[120px]">
                <SectionLabel>Integrations</SectionLabel>
                <div className="mt-2 flex gap-2">
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded rp-mono">Jira</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded rp-mono">GitHub</span>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      <CardDetailModal cardKey={activeCard} report={report} extractedColors={extractedColors} onClose={() => setActiveCard(null)} />

      {/* Integrations Settings Modal */}
      {showIntegrations && (
        <div className="rp-modal-backdrop" onClick={() => setShowIntegrations(false)}>
          <div className="rp-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="p-6 pb-4 border-b border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center border shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(99,102,241,0.33)", boxShadow: "0 0 24px rgba(99,102,241,0.13)" }}>
                  <span className="mso text-2xl" style={{ color: '#6366f1' }}>settings</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="rp-title text-left" style={{ color: '#6366f1' }}>Integrations</h2>
                  <p className="text-[#c2c6d6] text-sm text-left mt-1">Connect Jira or GitHub to create tickets from findings</p>
                </div>
                <button onClick={() => setShowIntegrations(false)}
                  className="rounded-sm opacity-70 cursor-pointer transition-opacity hover:opacity-100 text-[#c2c6d6] p-1" aria-label="Close">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-xs text-slate-400 rp-mono mb-2">Credentials are stored encrypted in your browser and sent directly to the API — never stored on the server.</p>
              {/* Jira */}
              <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">Jira</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input id="ji_url" placeholder="Jira URL" defaultValue={integrationKeys?.jira_url || ''} className="bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white rp-mono col-span-2" />
                  <input id="ji_email" placeholder="Email" defaultValue={integrationKeys?.jira_email || ''} className="bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white rp-mono" />
                  <input id="ji_token" type="password" placeholder="API Token" defaultValue={integrationKeys?.jira_api_token || ''} className="bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white rp-mono" />
                  <input id="ji_project" placeholder="Project Key" defaultValue={integrationKeys?.jira_project_key || ''} className="bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white rp-mono" />
                </div>
              </div>
              {/* GitHub */}
              <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                <h3 className="text-sm font-semibold text-purple-400 mb-3">GitHub Issues</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input id="gh_token" type="password" placeholder="GitHub Token" defaultValue={integrationKeys?.github_token || ''} className="bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white rp-mono col-span-2" />
                  <input id="gh_repo" placeholder="owner/repo" defaultValue={integrationKeys?.github_repo || ''} className="bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white rp-mono col-span-2" />
                </div>
              </div>
              <button
                onClick={() => {
                  const newKeys = {
                    jira_url: (document.getElementById('ji_url') as HTMLInputElement)?.value || '',
                    jira_email: (document.getElementById('ji_email') as HTMLInputElement)?.value || '',
                    jira_api_token: (document.getElementById('ji_token') as HTMLInputElement)?.value || '',
                    jira_project_key: (document.getElementById('ji_project') as HTMLInputElement)?.value || '',
                    github_token: (document.getElementById('gh_token') as HTMLInputElement)?.value || '',
                    github_repo: (document.getElementById('gh_repo') as HTMLInputElement)?.value || '',
                  };
                  setIntegrationKeys(newKeys);
                  saveIntegrationKeys(newKeys);
                  alert('Integration keys saved locally.');
                }}
                className="w-full text-xs py-2 rounded font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 cursor-pointer"
              >
                Save Keys Locally
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
}

function SkeletonLoader({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 w-full mt-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 rounded skeleton" 
          style={{ width: i === lines - 1 ? '60%' : '100%' }} 
        />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="rp-label text-[#c2c6d6] mb-4 uppercase">{children}</h3>;
}
function SectionLabelAbs({ children }: { children: React.ReactNode }) {
  return <h3 className="rp-label text-[#c2c6d6] absolute top-6 left-6 uppercase z-10">{children}</h3>;
}
function KV({ k, v, vClass = "text-[#e1e2ec]", last }: { k: string; v: string; vClass?: string; last?: boolean }) {
  return (
    <div className={"flex justify-between pb-2 " + (last ? "" : "border-b border-white/10")}>
      <span className="text-[#c2c6d6]">{k}</span>
      <span className={vClass}>{v}</span>
    </div>
  );
}
function DnsRow({ t, v, last }: { t: string; v: string; last?: boolean }) {
  return (
    <div className={"flex items-center justify-between pb-2 " + (last ? "" : "border-b border-white/10")}>
      <span className="px-2 py-0.5 rounded text-xs border border-white/20" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: PRIMARY }}>{t}</span>
      <span className="text-[#e1e2ec]">{v}</span>
    </div>
  );
}
function GlassCard({
  label, span, children, cardKey, loading,
}: { label: string; span: number; children: React.ReactNode; cardKey: string; loading?: boolean }) {
  const spanClass = span === 6 ? "md:col-span-6" : span === 5 ? "md:col-span-5" : "md:col-span-4";
  
  return (
    <div data-card={cardKey} role="button" tabIndex={0} className={`rp-bento col-span-1 ${spanClass} rounded-xl p-6 relative flex flex-col justify-center`}>
      <SectionLabelAbs>{label}</SectionLabelAbs>
      {loading ? (
        <div className="text-slate-500 rp-mono text-sm mt-8">Loading...</div>
      ) : (
        <div className="mt-8 rp-mono space-y-2 z-0">
          {children}
        </div>
      )}
    </div>
  );
}


type Detail = {
  title: string;
  subtitle: string;
  icon: string;
  accent?: string;
  sections: { label: string; rows: { k: string; v: string; mono?: boolean }[] }[];
  notes?: string[];
};

const getCardDetails = (report: any, extractedColors: any): Record<string, Detail> => {
  const security = report?.security;
  const performance = report?.performance;
  const hosting = report?.hosting;
  const domain = report?.domain;
  const github = report?.github;
  const carbon = report?.carbon;
  const dns = report?.dns_records;
  const traffic = report?.traffic;

  return {
    screenshot: {
      title: "Screenshot Preview",
      subtitle: `Rendered snapshot of ${report?.url || 'target'}`,
      icon: "photo_camera",
      sections: [
        { label: "Capture Details", rows: [
          { k: "Viewport", v: "1440 × 900", mono: true },
          { k: "Renderer", v: "Chromium (headless)", mono: true },
          { k: "Screenshot URL", v: report?.screenshot_url || "Not captured", mono: true }
        ]}
      ]
    },
    sbom: {
      title: "Supply Chain Vulnerabilities",
      subtitle: `Known CVEs in detected tech stack (${report?.sbom?.total_vulnerabilities ?? 0} total)`,
      icon: "inventory_2",
      accent: (report?.sbom?.critical_count || 0) > 0 ? '#ef4444' : (report?.sbom?.high_count || 0) > 0 ? '#f97316' : '#f59e0b',
      sections: [
        { label: "Vulnerability Summary", rows: [
          { k: "Total Vulnerabilities", v: String(report?.sbom?.total_vulnerabilities ?? 0) },
          { k: "Critical", v: String(report?.sbom?.critical_count ?? 0) },
          { k: "High", v: String(report?.sbom?.high_count ?? 0) },
          { k: "Medium", v: String(report?.sbom?.medium_count ?? 0) },
        ]},
        ...((report?.sbom?.packages || []).length > 0 ? (report?.sbom?.packages || []).slice(0, 20).map((pkg: any) => ({
          label: `${pkg.package_name}: ${pkg.vuln_id}`,
          rows: [
            { k: "Ecosystem", v: pkg.ecosystem },
            { k: "Severity", v: pkg.severity },
            { k: "Summary", v: pkg.summary || "No description" },
            { k: "Fixed Version", v: pkg.fixed_version || "Not specified" },
            ...(pkg.aliases?.length > 0 ? [{ k: "Aliases", v: pkg.aliases.join(", ") }] : []),
          ]
        })) : [])
      ]
    },
    tech: {
      title: "Tech Stack",
      subtitle: "Frameworks and libraries detected on target",
      icon: "code_blocks",
      sections: [
        { label: "Technologies", rows: (report?.tech_stack?.technologies || []).map((t: string) => ({
          k: t,
          v: "Detected"
        }))}
      ]
    },
    security: {
      title: `Security Grade: ${security?.ssl_grade || 'Unknown'}`,
      subtitle: `Security posture and response headers`,
      icon: "verified_user",
      accent: "#34d399",
      sections: [
        { label: "Headers", rows: [
          { k: "SSL Grade", v: security?.ssl_grade || "N/A" },
          { k: "Headers Grade", v: security?.headers_grade || "N/A" },
          { k: "HTTPS Supported", v: security?.https ? "Yes" : "No" }
        ]}
      ]
    },
    performance: {
      title: `Performance · ${performance?.performance_score || 0}%`,
      subtitle: "Core Web Vitals metrics from Google PageSpeed",
      icon: "speed",
      sections: [
        { label: "Core Web Vitals", rows: [
          { k: "Performance Score", v: (performance?.performance_score !== null && performance?.performance_score !== undefined) ? `${performance?.performance_score}%` : "N/A" },
          { k: "LCP (Largest Contentful Paint)", v: (performance?.lcp !== null && performance?.lcp !== undefined) ? `${performance?.lcp}s` : "N/A" },
          { k: "CLS (Cumulative Layout Shift)", v: (performance?.cls !== null && performance?.cls !== undefined) ? `${performance?.cls}` : "N/A" },
          { k: "FCP (First Contentful Paint)", v: (performance?.fcp !== null && performance?.fcp !== undefined) ? `${performance?.fcp}s` : "N/A" }
        ]}
      ]
    },
    hosting: {
      title: "Hosting Info",
      subtitle: "Origin server IP and geolocation data",
      icon: "cloud",
      sections: [
        { label: "Provider Details", rows: [
          { k: "ISP Provider", v: hosting?.isp || "Unknown" },
          { k: "ASN", v: hosting?.asn || "Unknown" },
          { k: "Server IP", v: hosting?.ip || "Unknown" },
          { k: "Location", v: `${hosting?.city || ''}, ${hosting?.country || 'Unknown'}` }
        ]}
      ]
    },
    domain: {
      title: "Domain Info",
      subtitle: "WHOIS/RDAP domain history and lifecycle details",
      icon: "calendar_today",
      sections: [
        { label: "Lifecycle", rows: [
          { k: "Registrar", v: domain?.registrar || "Unknown" },
          { k: "Created", v: domain?.created || "Unknown" },
          { k: "Expires", v: domain?.expires || "Unknown" },
          { k: "Age (Days)", v: (domain?.age_days !== null && domain?.age_days !== undefined) ? `${domain?.age_days} days` : "Unknown" }
        ]}
      ]
    },
    news: {
      title: "Recent News Mentions",
      subtitle: "Mentions from Google News indexes",
      icon: "newspaper",
      sections: [
        { label: "Mentions List", rows: (report?.news || []).slice(0, 4).map((n: any) => ({
          k: n?.source || "News",
          v: n?.title || ""
        }))}
      ]
    },
    github: {
      title: "GitHub Activity",
      subtitle: "Public repository indicators",
      icon: "code",
      sections: [
        { label: "Developer Activity", rows: [
          { k: "Repository Count", v: (github?.repos !== null && github?.repos !== undefined) ? String(github?.repos) : "N/A" },
          { k: "Followers", v: (github?.followers !== null && github?.followers !== undefined) ? String(github?.followers) : "N/A" },
          { k: "Exists", v: github?.exists ? "Yes" : "No" }
        ]}
      ]
    },
    palette: {
      title: "Extracted Colors",
      subtitle: "Visual palette values",
      icon: "palette",
      sections: [
        { label: "Palette Colors", rows: extractedColors?.palette && extractedColors.palette.length > 0 ? (
          extractedColors.palette.map((c: string, idx: number) => ({
            k: `Color ${idx + 1}`,
            v: c
          }))
        ) : [
          { k: "Dominant", v: extractedColors?.dominant || "None" }
        ]}
      ]
    },
    carbon: {
      title: `Carbon Impact: ${carbon?.rating || 'Low'}`,
      subtitle: "Website CO2 emissions footprint estimate",
      icon: "eco",
      accent: "#34d399",
      sections: [
        { label: "Footprint Details", rows: [
          { k: "Rating", v: carbon?.rating || "Low" },
          { k: "CO2 per View", v: (carbon?.grams_per_view !== null && carbon?.grams_per_view !== undefined) ? `${carbon?.grams_per_view}g` : "N/A" },
          { k: "Comparison Benchmark", v: (carbon?.cleaner_than !== null && carbon?.cleaner_than !== undefined) ? `Cleaner than ${carbon?.cleaner_than}% of sites` : "N/A" }
        ]}
      ]
    },
    dns: {
      title: "DNS Records",
      subtitle: "Public domain zone records",
      icon: "dns",
      sections: [
        { label: "Records List", rows: Object.entries(dns || {}).flatMap(([type, records]: any) => 
          (records || []).map((v: string) => ({ k: type, v }))
        )}
      ]
    },
    traffic: {
      title: `Global Traffic Rank: #${traffic?.tranco_rank || 'N/A'}`,
      subtitle: `Tranco traffic indicators`,
      icon: "trending_up",
      accent: "#34d399",
      sections: [
        { label: "Traffic Stats", rows: [
          { k: "Global Rank", v: (traffic?.tranco_rank !== null && traffic?.tranco_rank !== undefined) ? `#${traffic?.tranco_rank.toLocaleString()}` : "N/A" },
          { k: "Label", v: traffic?.rank_label || "N/A" }
        ]}
      ]
    },
    redirect_chain: {
      title: "Redirect Chain Details",
      subtitle: "Hop-by-hop HTTP redirection history",
      icon: "link",
      sections: [
        { label: "Hops", rows: (report?.redirect_chain?.hops || []).map((h: any, idx: number) => ({
          k: `Hop ${idx + 1} (${h.status})`,
          v: `${h.url} ${h.location ? '→ ' + h.location : ''}`
        }))}
      ]
    },
    email_security: {
      title: "Email Security Records",
      subtitle: "SPF, DMARC, and DKIM DNS records",
      icon: "mail",
      sections: [
        { label: "Records", rows: [
          { k: "SPF Record", v: report?.email_security?.spf_record || "No SPF record found" },
          { k: "DMARC Record", v: report?.email_security?.dmarc_record || "No DMARC record found" }
        ]}
      ]
    },
    social: {
      title: "Social Presence Inventory",
      subtitle: "Linked brand profiles on key platforms",
      icon: "share",
      sections: [
        { label: "Profiles", rows: [
          { k: "Twitter/X", v: report?.social?.twitter ? "Found" : "Not Found" },
          { k: "LinkedIn", v: report?.social?.linkedin ? "Found" : "Not Found" },
          { k: "GitHub", v: report?.social?.github ? "Found" : "Not Found" },
          { k: "Instagram", v: report?.social?.instagram ? "Found" : "Not Found" },
          { k: "Facebook", v: report?.social?.facebook ? "Found" : "Not Found" },
          { k: "YouTube", v: report?.social?.youtube ? "Found" : "Not Found" }
        ]}
      ]
    },
    trackers: {
      title: "Detected Trackers",
      subtitle: "Third-party analytics, CRM and pixel scripts",
      icon: "track_changes",
      sections: [
        { label: "Trackers List", rows: (report?.tech_stack?.trackers || []).map((t: string) => ({
          k: t,
          v: "Detected"
        }))}
      ]
    },
    wayback: {
      title: "Wayback Machine Archive",
      subtitle: "Historical index snapshots from archive.org",
      icon: "history",
      sections: [
        { label: "Archive Details", rows: [
          { k: "First Seen Year", v: report?.wayback?.first_seen || "N/A" },
          { k: "Latest Snapshot URL", v: report?.wayback?.latest_snapshot || "N/A" }
        ]}
      ]
    },
    fonts: {
      title: "Detected Fonts",
      subtitle: "Google Web Fonts referenced by the page",
      icon: "font_download",
      sections: [
        { label: "Fonts List", rows: (report?.tech_stack?.fonts || []).map((f: string) => ({
          k: f,
          v: "Active"
        }))}
      ]
    },
    robots: {
      title: "Robots.txt & Sitemap",
      subtitle: "Robots rules and sitemap discovery",
      icon: "smart_toy",
      sections: [
        { label: "Configuration", rows: [
          { k: "Sitemap URL", v: report?.robots?.sitemap_url || "Not declared" },
          { k: "Has Sitemap", v: report?.robots?.has_sitemap ? "Yes" : "No" }
        ]},
        { label: "Robots.txt Content", rows: [
          { k: "Raw content", v: report?.robots?.robots_txt || "None" }
        ]}
      ]
    },
    bgp: {
      title: "BGP Routing Details",
      subtitle: "Autonomous System routing network details",
      icon: "router",
      sections: [
        { label: "IP Prefixes", rows: [
          { k: "IPv4 Prefixes Count", v: String(report?.bgp?.prefixes_ipv4 ?? 0) },
          { k: "IPv6 Prefixes Count", v: String(report?.bgp?.prefixes_ipv6 ?? 0) }
        ]},
        { label: "Peering Information", rows: [
          { k: "Upstreams Count", v: String(report?.bgp?.upstreams_count ?? 0) },
          { k: "Downstreams Count", v: String(report?.bgp?.downstreams_count ?? 0) },
          { k: "Peers Count", v: String(report?.bgp?.peers_count ?? 0) }
        ]}
      ]
    },
    subdomains: {
      title: "Subdomain Inventory",
      subtitle: "Public hosts discovered via certificate transparency logs",
      icon: "dns",
      sections: [
        { label: "Detected Subdomains", rows: (report?.subdomains?.subdomains || []).map((sub: string) => ({
          k: sub,
          v: "Active"
        }))}
      ]
    },
    shadow_it: {
      title: "Shadow IT Discovery",
      subtitle: `Unauthorized/unknown hosts — ${report?.shadow_subdomains?.length || 0} found`,
      icon: "radar",
      accent: "#f97316",
      sections: [
        { label: "Classification Summary", rows: (() => {
          const subs = report?.shadow_subdomains || [];
          const staging = subs.filter((s: any) => s.classification === 'Staging').length;
          const dev = subs.filter((s: any) => s.classification === 'Development').length;
          const admin = subs.filter((s: any) => s.classification === 'Admin').length;
          const api = subs.filter((s: any) => s.classification === 'API').length;
          const mail = subs.filter((s: any) => s.classification === 'Mail').length;
          const cdn = subs.filter((s: any) => s.classification === 'CDN').length;
          const unknown = subs.filter((s: any) => s.classification === 'Unknown').length;
          return [
            { k: "Total Shadow Hosts", v: String(subs.length) },
            ...(staging > 0 ? [{ k: "Staging", v: String(staging) }] : []),
            ...(dev > 0 ? [{ k: "Development", v: String(dev) }] : []),
            ...(admin > 0 ? [{ k: "Admin Interfaces", v: String(admin) }] : []),
            ...(api > 0 ? [{ k: "API Endpoints", v: String(api) }] : []),
            ...(mail > 0 ? [{ k: "Mail Servers", v: String(mail) }] : []),
            ...(cdn > 0 ? [{ k: "CDN Origins", v: String(cdn) }] : []),
            ...(unknown > 0 ? [{ k: "Unclassified", v: String(unknown) }] : []),
          ];
        })() },
        { label: "Discovered Hosts", rows: (report?.shadow_subdomains || []).slice(0, 50).map((s: any) => ({
          k: s.subdomain,
          v: `${s.classification}${s.resolved_ip ? ` (${s.resolved_ip})` : ''}`
        }))}
      ]
    },
    reputation: {
      title: "Reputation Engine Threat Scan",
      subtitle: "Antivirus and reputation engine blacklisting checks",
      icon: "shield",
      sections: [
        { label: "Detections Summary", rows: [
          { k: "Malicious Detections", v: String(report?.reputation?.malicious_count ?? 0) },
          { k: "Suspicious Detections", v: String(report?.reputation?.suspicious_count ?? 0) },
          { k: "Total Engines Scanned", v: String(report?.reputation?.total_scanners ?? 70) },
          { k: "Assessment Result", v: report?.reputation?.status || "Clean" }
        ]}
      ]
    },
    observatory: {
      title: "Mozilla Observatory Header Compliance",
      subtitle: "Security headers configuration quality grading",
      icon: "verified_user",
      sections: [
        { label: "Summary Grade", rows: [
          { k: "Assigned Grade", v: report?.observatory?.grade || "Pending" },
          { k: "Header Security Score", v: report?.observatory?.score !== null && report?.observatory?.score !== undefined ? `${report.observatory.score}/100` : "N/A" }
        ]},
        { label: "Deductions & Compliance", rows: [
          { k: "Compliant Headers Passed", v: String(report?.observatory?.tests_passed ?? 0) },
          { k: "Non-Compliant Headers Failed", v: String(report?.observatory?.tests_failed ?? 0) }
        ]}
      ]
    },
    shodan: {
      title: "Shodan Exposure Intelligence",
      subtitle: "Open ports, services, and known vulnerabilities from Shodan",
      icon: "radar",
      accent: "#f97316",
      sections: [
        { label: "Open Ports", rows: (report?.shodan?.ports || []).map((p: number) => ({ k: `Port ${p}`, v: "Open" })) },
        { label: "Services Detected", rows: Object.entries(report?.shodan?.services || {}).map(([port, svc]: any) => ({ k: `Port ${port}`, v: svc })) },
        { label: "Known Vulnerabilities", rows: (report?.shodan?.vulns || []).map((v: string) => ({ k: v, v: "CVE" })) }
      ]
    },
    ssllabs: {
      title: "SSL Labs Grade",
      subtitle: "Proper SSL/TLS configuration grading",
      icon: "lock",
      accent: report?.ssllabs?.grade?.startsWith('A') ? '#34d399' : report?.ssllabs?.grade?.startsWith('B') ? '#f59e0b' : '#ef4444',
      sections: [
        { label: "SSL Configuration", rows: [
          { k: "Grade", v: report?.ssllabs?.grade || "N/A" },
          { k: "Protocol", v: report?.ssllabs?.protocol || "N/A" },
          { k: "Has Warnings", v: report?.ssllabs?.has_warnings ? "Yes ⚠" : "No" },
          { k: "Weak Protocols", v: (report?.ssllabs?.weak_protocols || []).join(", ") || "None" }
        ]}
      ]
    },
    securitytrails: {
      title: "SecurityTrails DNS History",
      subtitle: "Historical DNS records and subdomain discovery",
      icon: "dns",
      accent: "#6366f1",
      sections: [
        { label: "Subdomains", rows: (report?.securitytrails?.subdomains || []).slice(0, 50).map((s: string) => ({ k: s, v: "Active" })) },
        { label: "DNS History", rows: (report?.securitytrails?.dns_history || []).slice(0, 50).map((r: any) => ({ k: r.type || "Record", v: `${r.value} (${r.first_seen || "?"} → ${r.last_seen || "?"})` })) }
      ]
    },
    compliance: {
      title: "Compliance Dashboard",
      subtitle: "SOC2 and NIST CSF control mapping",
      icon: "verified_user",
      accent: "#34d399",
      sections: [
        { label: "SOC2 Controls", rows: (report?.compliance_soc2?.controls || []).map((c: any) => ({
          k: c.control_id,
          v: c.passed ? "Pass" : "Fail"
        })) },
        { label: "NIST CSF Controls", rows: (report?.compliance_nist?.controls || []).map((c: any) => ({
          k: c.control_id,
          v: c.passed ? "Pass" : "Fail"
        })) }
      ]
    },
    darkweb: {
      title: "Dark Web Intel",
      subtitle: "Breach alerts and leaked subdomain intelligence",
      icon: "visibility_off",
      accent: "#ef4444",
      sections: [
        { label: "Breaches", rows: (report?.darkweb?.breaches || []).length > 0
          ? (report?.darkweb?.breaches || []).map((b: any) => ({ k: b.name || "Breach", v: `${b.date || "?"} — ${b.email || b.domain || "?"}` }))
          : [{ k: "Status", v: "No breaches detected" }]
        },
        { label: "Leaked Subdomains", rows: (report?.darkweb?.leaked_subdomains || []).length > 0
          ? (report?.darkweb?.leaked_subdomains || []).map((s: string) => ({ k: s, v: "Leaked" }))
          : [{ k: "Status", v: "No leaked subdomains found" }]
        }
      ]
    },
    attack_path: {
      title: "Attack Surface Graph",
      subtitle: `Visualized attack path — ${report?.attack_path?.length || 0} nodes`,
      icon: "account_tree",
      accent: "#ef4444",
      sections: (() => {
        const nodes = report?.attack_path || [];
        // Show node hierarchy
        const root = nodes.find((n: any) => n.id === 'root');
        const children = nodes.filter((n: any) => n.id !== 'root');
        return [
          { label: "Root Domain", rows: root ? [{ k: "Domain", v: root.label }, { k: "Children", v: String(root.children?.length || 0) }] : [{ k: "Info", v: "No root" }] },
          ...children.slice(0, 15).map((n: any) => ({
            label: `${n.type?.toUpperCase()}: ${n.label}`,
            rows: [
              { k: "Type", v: n.type || "Unknown" },
              { k: "Severity", v: n.severity || "Info" },
              { k: "Children", v: String(n.children?.length || 0) },
              ...(n.data?.mitre?.length > 0 ? [{ k: "MITRE ATT&CK", v: n.data.mitre.map((m: any) => `${m.technique_id} ${m.name}`).join(", ") }] : []),
            ]
          }))
        ];
      })()
    },
    remediation: {
      title: "Remediation Guide",
      subtitle: `Auto-generated configuration fixes (${report?.remediation_steps?.length || 0} steps)`,
      icon: "build",
      accent: "#f59e0b",
      sections: (report?.remediation_steps || []).map((step: any, idx: number) => ({
        label: `${idx + 1}. ${step.title}`,
        rows: [
          { k: "Description", v: step.description || "" },
          ...(step.mitre_attack?.length > 0 ? step.mitre_attack.map((m: any) => ({
            k: `MITRE ATT&CK: ${m.technique_id}`,
            v: `${m.name} (${m.tactic})`
          })) : []),
          { k: "Nginx Config", v: step.nginx || "N/A", mono: true },
          { k: "Apache Config", v: step.apache || "N/A", mono: true }
        ]
      }))
    }
  };
};

function CardDetailModal({ cardKey, report, extractedColors, onClose }: { cardKey: string | null; report: any; extractedColors: any; onClose: () => void }) {
  const isRemediation = cardKey === 'remediation';
  const [activeStep, setActiveStep] = useState(0);
  const [stepTab, setStepTab] = useState<'nginx' | 'apache'>('nginx');
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [ignoredSet, setIgnoredSet] = useState<Set<string>>(() => {
    const ignored = getIgnoredFindings();
    return new Set(ignored.map(f => `${f.reportUrl}::${f.stepTitle}`));
  });

  const details = getCardDetails(report, extractedColors);
  const detail = cardKey ? details[cardKey] : null;
  const accent = detail?.accent ?? PRIMARY;

  const reportUrl = report?.url || '';
  const allSteps = report?.remediation_steps || [];
  const remediationSteps = showIgnored ? allSteps : allSteps.filter((s: any) => !isFindingIgnored(reportUrl, s.title));
  const currentStep = remediationSteps[activeStep] || null;

  const handleIgnore = (stepTitle: string) => {
    addIgnoredFinding(reportUrl, stepTitle);
    setIgnoredSet(new Set([...ignoredSet, `${reportUrl}::${stepTitle}`]));
    if (activeStep >= remediationSteps.length - 1 && remediationSteps.length > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  useEffect(() => {
    if (!detail) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [detail, onClose]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(id);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIdx(id);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  if (!detail) return null;

  return (
    <div className="rp-modal-backdrop" onClick={onClose}>
      <div className="rp-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: isRemediation ? '800px' : undefined }}>
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center border shrink-0"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderColor: `${accent}55`,
                boxShadow: `0 0 24px ${accent}22`,
              }}
            >
              <span className="mso text-2xl" style={{ color: accent }}>{detail.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="rp-title text-left" style={{ color: accent }}>
                {detail.title}
              </h2>
              <p className="text-[#c2c6d6] text-sm text-left mt-1">
                {detail.subtitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 cursor-pointer transition-opacity hover:opacity-100 text-[#c2c6d6] p-1"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="2" x2="14" y2="14" />
                <line x1="14" y1="2" x2="2" y2="14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
          {isRemediation && remediationSteps.length > 0 ? (
          <div className="flex flex-col md:flex-row max-h-[65vh]">
            {/* Step sidebar */}
            <div className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto p-3 space-y-1">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-slate-500 rp-mono">{remediationSteps.length} steps</span>
                <button
                  onClick={() => setShowIgnored(!showIgnored)}
                  className={`text-[10px] px-2 py-0.5 rounded rp-mono transition-all cursor-pointer ${showIgnored ? 'bg-slate-500/20 text-slate-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {showIgnored ? 'Hide Ignored' : 'Show Ignored'}
                </button>
              </div>
              {remediationSteps.map((step: any, idx: number) => {
                const stepIgnored = isFindingIgnored(reportUrl, step.title);
                return (
                  <div key={idx} className="flex items-start gap-1">
                    <button
                      onClick={() => { setActiveStep(idx); setStepTab('nginx'); }}
                      className={`flex-1 text-left px-3 py-2 rounded text-xs transition-all cursor-pointer ${
                        activeStep === idx
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : stepIgnored
                            ? 'text-slate-500 hover:bg-white/5 border border-transparent line-through'
                            : 'text-[#c2c6d6] hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="font-semibold mb-0.5">Step {idx + 1}</div>
                      <div className="truncate opacity-80">{step.title}</div>
                    </button>
                    {!stepIgnored && (
                      <button
                        onClick={() => handleIgnore(step.title)}
                        className="mt-1 p-1 rounded text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Mark as false positive"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step detail */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentStep && (
                <>
                  <div>
                    <h4 className="text-amber-400 font-semibold text-sm mb-1">{currentStep.title}</h4>
                    <p className="text-[#c2c6d6] text-xs leading-relaxed">{currentStep.description}</p>
                  </div>

                  {/* Tab switcher */}
                  <div className="flex gap-2 border-b border-white/10 pb-2">
                    <button
                      onClick={() => setStepTab('nginx')}
                      className={`text-xs px-3 py-1 rounded-t cursor-pointer transition-colors ${
                        stepTab === 'nginx'
                          ? 'text-white border-b-2 border-amber-400'
                          : 'text-[#c2c6d6] hover:text-white'
                      }`}
                    >
                      Nginx
                    </button>
                    <button
                      onClick={() => setStepTab('apache')}
                      className={`text-xs px-3 py-1 rounded-t cursor-pointer transition-colors ${
                        stepTab === 'apache'
                          ? 'text-white border-b-2 border-amber-400'
                          : 'text-[#c2c6d6] hover:text-white'
                      }`}
                    >
                      Apache
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={async () => {
                        setVerifyLoading(true);
                        setVerifyStatus(null);
                        try {
                          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                          const res = await axios.post(`${apiBaseUrl}/api/enterprise/report/${report?.id}/verify-fix`);
                          setVerifyStatus(res.data.message || 'Fix verified successfully');
                        } catch (err: any) {
                          setVerifyStatus(err.response?.data?.detail || 'Verification failed');
                        } finally {
                          setVerifyLoading(false);
                        }
                      }}
                      disabled={verifyLoading}
                      className="text-xs px-3 py-1 rounded cursor-pointer transition-colors font-semibold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50"
                    >
                      {verifyLoading ? 'Verifying...' : 'Verify Fix'}
                    </button>
                  </div>
                  {verifyStatus && (
                    <div className={`text-xs rp-mono px-3 py-1.5 rounded ${verifyStatus.includes('fail') || verifyStatus.includes('error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {verifyStatus}
                    </div>
                  )}

                  {/* Code block */}
                  <div className="relative group">
                    <div
                      className="rounded-lg border border-white/10 p-4 text-xs rp-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto"
                      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                    >
                      <code>{stepTab === 'nginx' ? currentStep.nginx : currentStep.apache}</code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(stepTab === 'nginx' ? currentStep.nginx : currentStep.apache, `${activeStep}-${stepTab}`)}
                      className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      style={{
                        backgroundColor: copiedIdx === `${activeStep}-${stepTab}` ? '#10b981' : 'rgba(255,255,255,0.1)',
                        color: copiedIdx === `${activeStep}-${stepTab}` ? 'white' : '#c2c6d6',
                        border: '1px solid rgba(255,255,255,0.15)'
                      }}
                    >
                      {copiedIdx === `${activeStep}-${stepTab}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-6">
            {detail.sections.map((sec) => (
              <div key={sec.label}>
                <h4 className="rp-label uppercase text-[#c2c6d6] mb-3">{sec.label}</h4>
                <div className="rounded-lg border border-white/10 divide-y divide-white/10"
                     style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  {sec.rows.map((r) => (
                    <div key={r.k} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-[#c2c6d6] text-sm">{r.k}</span>
                      <span className={r.mono ? "rp-mono text-right break-all" : "text-[#e1e2ec] text-sm text-right break-all"}>
                        {r.v && (r.v.startsWith('http://') || r.v.startsWith('https://')) ? (
                          <a href={r.v} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            {r.v}
                          </a>
                        ) : (
                          r.v
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {detail.notes?.map((n) => (
              <p key={n} className="rp-mono text-xs text-[#c2c6d6]">{n}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
