import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useReportStream } from './hooks/useReportStream';
import BlurReveal from './components/BlurReveal';
import ShareButton from './components/ShareButton';

// Import bento components
import ScreenshotCard from './components/cards/ScreenshotCard';
import TechStackCard from './components/cards/TechStackCard';
import SecurityCard from './components/cards/SecurityCard';
import PerformanceCard from './components/cards/PerformanceCard';
import HostingCard from './components/cards/HostingCard';
import DomainCard from './components/cards/DomainCard';
import NewsCard from './components/cards/NewsCard';
import GitHubCard from './components/cards/GitHubCard';
import ColorPaletteCard from './components/cards/ColorPaletteCard';
import CarbonCard from './components/cards/CarbonCard';
import DNSCard from './components/cards/DNSCard';
import TrafficCard from './components/cards/TrafficCard';

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [activeReportId, setActiveReportId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef(null);

  const { report, status } = useReportStream(activeReportId);

  // Load report from path on init
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/r/')) {
      const id = path.replace('/r/', '');
      if (id) {
        setActiveReportId(id);
      }
    }
  }, []);

  // WebGL Organic Fluid Background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_texCoord = a_position * 0.5 + 0.5;
      }
    `;
    
    const fsSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          vec2 shift = vec2(100.0);
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < 5; ++i) {
              v += a * noise(p);
              p = rot * p * 2.0 + shift;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          vec2 uv = v_texCoord;
          vec2 p = (uv * 2.0 - 1.0) * (u_resolution / min(u_resolution.x, u_resolution.y));
          
          vec2 mouse = (u_mouse / u_resolution) * 2.0 - 1.0;
          mouse *= (u_resolution / min(u_resolution.x, u_resolution.y));
          float dist = length(p - mouse);
          float mInfluence = smoothstep(0.8, 0.0, dist) * 0.1;
          
          float n = fbm(p * 1.5 + u_time * 0.1 + mInfluence);
          float m = fbm(p * 2.0 - u_time * 0.15 + n);
          
          vec3 color1 = vec3(0.02, 0.04, 0.08); 
          vec3 color2 = vec3(0.05, 0.1, 0.2);   
          vec3 color3 = vec3(0.23, 0.51, 0.96); 
          
          vec3 color = mix(color1, color2, n);
          color = mix(color, color3, m * 0.4);
          
          float scanline = sin(uv.y * 800.0) * 0.04;
          color += scanline;
          
          gl_FragColor = vec4(color, 1.0);
      }
    `;

    const createShader = (gl, type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e) => {
        mouseX = e.clientX;
        mouseY = window.innerHeight - e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let animationId;
    const render = (time) => {
        time *= 0.001;
        gl.uniform1f(timeLocation, time);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(mouseLocation, mouseX, mouseY);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!urlInput) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post('http://localhost:8000/api/report', { url: urlInput });
      setActiveReportId(data.report_id);
      window.history.pushState(null, '', `/r/${data.report_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to start website intelligence scan.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = status === 'pending';

  return (
    <div className="min-h-screen text-on-surface flex antialiased">
      {/* WebGL Background */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10"></canvas>

      {/* Side Navigation */}
      <nav className="hidden md:flex flex-col h-full py-6 px-4 bg-[#0a0a0a]/40 backdrop-blur-[24px] saturate-[180%] border-r border-white/10 fixed left-0 w-64 z-40 transition-all duration-300">
        <div className="mb-8 px-4">
          <h1 className="font-headline-lg text-2xl font-bold text-primary tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">RECON_PULSE</h1>
          <p className="font-label-sm text-[10px] text-on-surface-variant mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Live intelligence panel</p>
        </div>
        <button 
          onClick={() => { setActiveReportId(null); setUrlInput(''); window.history.pushState(null, '', '/'); }}
          className="mb-8 w-full bg-primary/95 text-on-primary font-semibold py-3 rounded-lg hover:shadow-[0_0_20px_rgba(173,198,255,0.5)] transition-all duration-300 transform hover:scale-[1.02] backdrop-blur-sm cursor-pointer"
        >
            New Scan
        </button>
        <ul className="flex-1 space-y-2">
          <li>
            <a className="flex items-center gap-3 px-4 py-3 bg-primary/20 text-primary border border-primary/30 rounded-lg transition-all shadow-[0_0_15px_rgba(173,198,255,0.1)] backdrop-blur-md" href="#">
              <span className="material-symbols-outlined drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">dashboard</span>
              <span className="font-semibold text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Overview</span>
            </a>
          </li>
        </ul>
        <div className="mt-auto pt-6 border-t border-white/10 space-y-2 text-xs text-on-surface-variant font-mono-data">
          <div>Version 1.0.0</div>
          <div>Secure operations console</div>
        </div>
      </nav>

      {/* Main Panel Canvas */}
      <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col">
        {/* Top AppBar */}
        <header className="bg-[#0a0a0a]/40 backdrop-blur-[24px] saturate-[180%] border-b border-white/10 flex items-center justify-between px-8 py-4 w-full sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="font-display-xl text-lg font-bold tracking-tighter text-primary md:hidden drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Recon Pulse</h2>
          </div>
          <div className="flex items-center gap-4">
            {activeReportId && <ShareButton reportId={activeReportId} />}
            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-white/20 overflow-hidden shadow-[0_0_10px_rgba(173,198,255,0.2)]">
              <div className="w-full h-full bg-slate-800 flex items-center justify-center font-mono-data text-xs text-primary font-bold">
                OP
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 md:p-12 max-w-[1600px] mx-auto w-full flex-1">
          {/* Target Scan Domain Search Input */}
          <div className="mb-12 flex justify-center w-full relative z-20">
            <form onSubmit={handleScan} className="relative w-full max-w-2xl flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                <span className="material-symbols-outlined animate-pulse drop-shadow-[0_0_8px_rgba(173,198,255,0.8)]">radar</span>
              </div>
              <input
                type="text"
                placeholder="Enter target domain or IP..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-[#0a0a0a]/60 backdrop-blur-[24px] saturate-[180%] border border-white/20 rounded-full py-4 pl-12 pr-24 font-mono-data text-sm text-on-surface focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-[0_0_30px_rgba(59,130,246,0.2)] placeholder-on-surface-variant/70"
              />
              <button
                type="submit"
                disabled={submitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600/90 backdrop-blur-md text-white border border-blue-400/30 px-6 py-2 rounded-full font-semibold text-sm hover:bg-blue-500 animate-pulse-breathe transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Pulse...' : 'Scan'}
              </button>
            </form>
          </div>

          {/* Bento Grid */}
          {activeReportId && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-bento-gap relative z-10">
              <ScreenshotCard data={report} loading={isLoading} />
              <TechStackCard data={report} loading={isLoading} />
              <SecurityCard data={report} loading={isLoading} />
              <PerformanceCard data={report} loading={isLoading} />
              
              <div className="col-span-1 md:col-span-6">
                <BlurReveal label="Classified Host Data" icon="lock">
                  <HostingCard data={report} loading={isLoading} />
                </BlurReveal>
              </div>

              <DomainCard data={report} loading={isLoading} />
              <NewsCard data={report} loading={isLoading} />
              <GitHubCard data={report} loading={isLoading} />
              <ColorPaletteCard data={report} loading={isLoading} />
              <CarbonCard data={report} loading={isLoading} />
              
              <div className="col-span-1 md:col-span-5">
                <BlurReveal label="Protected Zone Data" icon="dns">
                  <DNSCard data={report} loading={isLoading} />
                </BlurReveal>
              </div>

              <TrafficCard data={report} loading={isLoading} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
