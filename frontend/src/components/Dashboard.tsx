import { useEffect, useRef, useState } from "react";
import axios from 'axios';
import { useReportStream } from '../hooks/useReportStream';

const AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAyu8MpVA8eQoO2NaGUTP0oUdhDvx9ZR3Tkmgv4MHUW9rOsq72J13d3DjW0_cAu7njxxO-4uFiMQ5i73UOkMm_iEEUWwEXGNo_V7YjqwoW2TBq3Tqtg-33boBRUeWyhnptsvTaAN7lmq16W2t5uf08KCEVdVcpYVDnVL8Cj6ZSprDV-dXhG-KuvjLQxKw45zbRAjCPZIFSyXoWfjJRwElWv6TBqDUTnJkrKjNTyl1veFGZ2N8tlSNhkVw";

const PRIMARY = "#adc6ff";

const navItems = [
  { icon: "dashboard", label: "Overview", active: true },
];

export function Dashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  
  // Dynamic report polling state
  const [urlInput, setUrlInput] = useState('');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [exported, setExported] = useState(false);


  const [extractedColors, setExtractedColors] = useState<{ dominant: string; palette: string[] } | null>(null);


  const { report, status } = useReportStream(activeReportId);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('rp_history') || '[]');
      setHistoryList(history);
    } catch (e) {
      console.warn('load history failed', e);
    }
  }, [status]);

  // Save successful scan to history
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
    }
  }, [status, report, activeReportId]);

  const handleHistoryClick = async (url: string) => {
    setUrlInput(url);
    setSubmitting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const { data } = await axios.post(`${apiBaseUrl}/api/report`, { url });
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

  // Auto load report from path on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/r/')) {
      const id = path.replace('/r/', '');
      if (id) {
        setActiveReportId(id);
      }
    }
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    setSubmitting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const { data } = await axios.post(`${apiBaseUrl}/api/report`, { url: urlInput });
      setActiveReportId(data.report_id);
      window.history.pushState(null, '', `/r/${data.report_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to start website intelligence scan.');
    } finally {
      setSubmitting(false);
    }
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


  const isLoading = status === 'pending';

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

  return (
    <div
      className="min-h-screen flex antialiased text-[#e1e2ec]"
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

        .rp-glass-overlay {
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          background-color: rgba(15,15,15,0.75); transition: opacity .3s ease;
        }
        .rp-glass:hover .rp-glass-overlay { opacity:0; pointer-events:none; }
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
            <form onSubmit={handleScan} className="relative w-full max-w-2xl flex items-center mb-4">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: PRIMARY }}>
                <span className="mso animate-pulse">radar</span>
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter target domain or IP..."
                className="w-full border border-white/20 rounded-full py-4 pl-12 pr-28 rp-mono text-[#e1e2ec] focus:outline-none focus:border-blue-500"
                style={{
                  backgroundColor: "rgba(10,10,10,0.6)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  boxShadow: "0 0 30px rgba(59,130,246,0.35)",
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="absolute right-2 top-1/2 rp-breathe text-white border border-blue-400/30 px-6 py-2 rounded-full rp-title transition-all cursor-pointer disabled:opacity-50"
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
              <div data-card="screenshot" role="button" tabIndex={0} className={`rp-bento col-span-1 md:col-span-8 rounded-xl p-6 min-h-[400px] flex flex-col ${isLoading ? 'rp-shimmer' : ''}`}>
                <SectionLabel>Screenshot Preview</SectionLabel>
                <div className="flex-1 bg-black/40 rounded-lg border border-white/5 overflow-hidden relative">
                  {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 rp-mono">Capturing screenshot...</div>
                  ) : report?.screenshot_url ? (
                    <>
                      <img src={report?.screenshot_url} alt="Site screenshot" className="w-full h-full object-cover opacity-90 mix-blend-screen" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#c2c6d6] rp-mono text-xs">No screenshot captured</div>
                  )}
                </div>
              </div>

              {/* Tech stack */}
              <div data-card="tech" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col min-h-[220px]">
                <SectionLabel>Tech Stack</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-sm mt-auto">Detecting technologies...</div>
                ) : (report?.tech_stack?.technologies || []).length > 0 ? (
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
                )}
              </div>

              {/* Security */}
              <div data-card="security" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <SectionLabelAbs>Security Grade</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-sm mt-8">Analyzing...</div>
                ) : (
                  <div className="font-bold mt-8 text-[80px] leading-none" style={{ color: "#34d399", textShadow: "0 0 25px rgba(52,211,153,0.5)" }}>
                    {report?.security?.ssl_grade || '?'}
                  </div>
                )}
              </div>

              {/* Performance */}
              <div data-card="performance" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center">
                <SectionLabelAbs>Performance</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-sm mt-8">Calculating...</div>
                ) : (
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
                )}
              </div>

              {/* Hosting */}
              <GlassCard cardKey="hosting" label="Hosting Info" icon="lock" title="Classified Host Data" span={6} loading={isLoading}>
                <KV k="Provider" v={report?.hosting?.isp || 'Unknown'} />
                <KV k="Location" v={`${report?.hosting?.city || ''}, ${report?.hosting?.country || 'Unknown'}`} />
                <KV k="IP Address" v={report?.hosting?.ip || 'Unknown'} vClass="text-[#adc6ff]" last />
              </GlassCard>

              {/* Domain Age */}
              <div data-card="domain" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Domain Age</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Parsing history...</div>
                ) : (
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
                )}
              </div>

              {/* News */}
              <div data-card="news" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-5 rounded-xl p-6 flex flex-col min-h-[220px]">
                <SectionLabel>Recent Mentions</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-auto">Searching news...</div>
                ) : (report?.news || []).length > 0 ? (
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
                )}
              </div>

              {/* GitHub */}
              <div data-card="github" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-center min-h-[180px]">
                <SectionLabelAbs>GitHub Activity</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-8">Checking...</div>
                ) : report?.github?.exists ? (
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
                ) : (
                  <div className="text-[#c2c6d6] rp-mono text-xs mt-8">No public profile found</div>
                )}
              </div>

              {/* Palette */}
              <div data-card="palette" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col min-h-[220px]">
                <SectionLabel>Extracted Palette</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-auto">Extracting colors...</div>
                                ) : (extractedColors?.palette && extractedColors.palette.length > 0) ? (
                  <div className="flex gap-4 mt-auto h-20">
                    {extractedColors.palette.map((c: string) => (
                      <div 
                        key={c} 
                        className="flex-1 rounded-lg border border-white/20 relative group overflow-hidden cursor-pointer"
                        style={{ backgroundColor: c, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(c);
                          setCopiedHex(c);
                          setTimeout(() => setCopiedHex(null), 2000);
                        }}
                      >
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity backdrop-blur-sm">
                          <span className="rp-mono text-white text-xs select-all">{c}</span>
                          <span className="text-[10px] text-slate-400 mt-1">Click to copy</span>
                        </div>
                        {copiedHex === c && (
                          <div className="absolute inset-0 bg-green-600/90 flex items-center justify-center text-white text-xs font-bold rp-mono">
                            Copied!
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                ) : (
                  <div className="text-[#c2c6d6] rp-mono text-xs mt-auto">No palette available</div>
                )}
              </div>

              {/* Carbon */}
              <div data-card="carbon" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
                <SectionLabelAbs>Carbon Impact</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-6">Analyzing eco...</div>
                ) : (
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
                )}
              </div>

              {/* DNS */}
              <GlassCard cardKey="dns" label="DNS Records" icon="dns" title="Protected Zone Data" span={5} loading={isLoading}>
                {report?.dns_records?.A ? (
                  <>
                    <DnsRow t="A" v={report?.dns_records?.A?.[0]} />
                    {report?.dns_records?.AAAA?.[0] && <DnsRow t="AAAA" v={report?.dns_records?.AAAA?.[0]} />}
                    {report?.dns_records?.MX?.[0] && <DnsRow t="MX" v={report?.dns_records?.MX?.[0]} last />}
                  </>
                ) : (
                  <div className="text-[#c2c6d6] text-xs rp-mono">No DNS resolved</div>
                )}
              </GlassCard>

              {/* Traffic */}
              <div data-card="traffic" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-center min-h-[180px]">
                <SectionLabelAbs>Global Traffic Rank</SectionLabelAbs>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs mt-8">Loading rank...</div>
                ) : (
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
                )}
              </div>

              {/* Redirect Chain */}
              <div data-card="redirect_chain" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Redirect Chain</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Tracking redirects...</div>
                ) : (report?.redirect_chain?.hops || []).length > 0 ? (
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
                )}
              </div>

              {/* Email Security */}
              <div data-card="email_security" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Email Security</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Scanning DNS...</div>
                ) : (
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
                )}
              </div>

              {/* Social Presence */}
              <div data-card="social" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Social Presence</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Looking up brand profiles...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs rp-mono">
                    {[
                      { icon: "🐦", name: "Twitter", val: report?.social?.twitter },
                      { icon: "💼", name: "LinkedIn", val: report?.social?.linkedin },
                      { icon: "🐙", name: "GitHub", val: report?.social?.github },
                      { icon: "📸", name: "Instagram", val: report?.social?.instagram },
                      { icon: "📘", name: "Facebook", val: report?.social?.facebook },
                      { icon: "▶️", name: "YouTube", val: report?.social?.youtube },
                    ].map((p) => (
                      <div key={p.name} className={`flex items-center gap-1 p-1.5 rounded border transition-colors ${p.val ? 'border-blue-400/30 bg-blue-400/10 text-white' : 'border-white/5 bg-white/5 text-slate-500'}`}>
                        <span>{p.icon}</span>
                        <span className="truncate">{p.name}</span>
                        <span className="ml-auto">{p.val ? "✓" : "✗"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trackers */}
              <div data-card="trackers" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Trackers & Cookies</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Scanning headers...</div>
                ) : (report?.tech_stack?.trackers || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-auto max-h-[100px] overflow-y-auto">
                    {(report.tech_stack.trackers || []).map((t: string) => (
                      <span key={t} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] rp-mono text-slate-300">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 rp-mono text-xs mt-auto">No trackers detected.</div>
                )}
              </div>

              {/* Website Age */}
              <div data-card="wayback" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Website Age</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Checking archive...</div>
                ) : (
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
                  </div>
                )}
              </div>

              {/* Fonts */}
              <div data-card="fonts" role="button" tabIndex={0} className="rp-bento col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
                <SectionLabel>Google Fonts</SectionLabel>
                {isLoading ? (
                  <div className="text-slate-500 rp-mono text-xs">Analyzing styles...</div>
                ) : (report?.tech_stack?.fonts || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-auto max-h-[100px] overflow-y-auto">
                    {(report.tech_stack.fonts || []).map((f: string) => (
                      <span key={f} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] rp-mono text-slate-300">
                        {f}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 rp-mono text-xs mt-auto">No custom web fonts detected.</div>
                )}
              </div>

            </div>
          )}
        </div>
      </main>

      <CardDetailModal cardKey={activeCard} report={report} extractedColors={extractedColors} onClose={() => setActiveCard(null)} />
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
  label, icon, title, span, children, cardKey, loading,
}: { label: string; icon: string; title: string; span: number; children: React.ReactNode; cardKey: string; loading?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const spanClass = span === 6 ? "md:col-span-6" : span === 5 ? "md:col-span-5" : "md:col-span-4";
  
  return (
    <div data-card={cardKey} role="button" tabIndex={0} className={`rp-bento rp-glass col-span-1 ${spanClass} rounded-xl p-6 relative flex flex-col justify-center`}>
      <SectionLabelAbs>{label}</SectionLabelAbs>
      {loading ? (
        <div className="text-slate-500 rp-mono text-sm mt-8">Loading...</div>
      ) : (
        <>
          <div className={`mt-8 rp-mono space-y-2 z-0 transition-all duration-500 ${revealed ? 'blur-none' : 'blur-sm select-none pointer-events-none'}`}>
            {children}
          </div>
          {!revealed && (
            <div className="rp-glass-overlay absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl">
              <span className="mso mb-2 text-4xl" style={{ color: PRIMARY, textShadow: "0 0 8px rgba(173,198,255,0.5)" }}>{icon}</span>
              <p className="rp-mono text-white mb-4">{title}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
                className="border border-white/20 text-white px-4 py-1 rounded rp-label cursor-pointer"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                Click to Reveal
              </button>
            </div>
          )}
        </>
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
    }

  };
};

function CardDetailModal({ cardKey, report, extractedColors, onClose }: { cardKey: string | null; report: any; extractedColors: any; onClose: () => void }) {
  const details = getCardDetails(report, extractedColors);
  const detail = cardKey ? details[cardKey] : null;
  const accent = detail?.accent ?? PRIMARY;

  // Close on Escape key
  useEffect(() => {
    if (!detail) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div className="rp-modal-backdrop" onClick={onClose}>
      <div className="rp-modal-content" onClick={(e) => e.stopPropagation()}>
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
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-6">
          {detail.sections.map((sec) => (
            <div key={sec.label}>
              <h4 className="rp-label uppercase text-[#c2c6d6] mb-3">{sec.label}</h4>
              <div className="rounded-lg border border-white/10 divide-y divide-white/10"
                   style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                {sec.rows.map((r) => (
                  <div key={r.k} className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-[#c2c6d6] text-sm">{r.k}</span>
                    <span className={r.mono ? "rp-mono text-right" : "text-[#e1e2ec] text-sm text-right"}>
                      {r.v}
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
      </div>
    </div>
  );
}

export default Dashboard;
