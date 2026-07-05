import { useState, useEffect } from 'react';
import axios from 'axios';
import { useReportStream } from './hooks/useReportStream';
import BlurReveal from './components/BlurReveal';
import ShareButton from './components/ShareButton';

// Import scanner cards
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

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [activeReportId, setActiveReportId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { report, status } = useReportStream(activeReportId);

  // Auto-load report from URL path if present
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/r/')) {
      const id = path.replace('/r/', '');
      if (id) {
        setActiveReportId(id);
      }
    }
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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <header className="max-w-6xl mx-auto px-6 py-8 border-b border-slate-900/60 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tight">
            RECON PULSE
          </span>
          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-bold">
            BETA
          </span>
        </div>
        <div className="text-xs text-slate-500">Website Intelligence Scanner</div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-12">
        <section className="flex flex-col items-center gap-4 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Full website intelligence in 30 seconds
          </h1>
          <p className="text-sm text-slate-400">
            Get instant security grades, tech stack identification, traffic ranks, carbon stats, and page performance.
          </p>
          <form onSubmit={handleScan} className="w-full mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Enter website URL or domain (e.g., github.com)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Initializing...' : 'Pulse Scan'}
            </button>
          </form>
        </section>

        {activeReportId && (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800/80 rounded-2xl p-6 gap-4">
              <div className="flex items-center gap-4">
                {report?.favicon && (
                  <img src={report.favicon} alt="Favicon" className="w-10 h-10 rounded-lg bg-slate-950 p-1.5 border border-slate-800/60" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{report?.og_title || report?.url}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      status === 'complete' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse'
                    }`}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                  {report?.og_description && (
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">{report.og_description}</p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-0.5">{report?.url}</p>
                </div>
              </div>
              <ShareButton reportId={activeReportId} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScreenshotCard data={report} loading={isLoading} />
              <TechStackCard data={report} loading={isLoading} />
              <SecurityCard data={report} loading={isLoading} />
              <PerformanceCard data={report} loading={isLoading} />
              
              <BlurReveal label="Reveal hosting stats">
                <HostingCard data={report} loading={isLoading} />
              </BlurReveal>
              
              <DomainCard data={report} loading={isLoading} />
              <NewsCard data={report} loading={isLoading} />
              <GitHubCard data={report} loading={isLoading} />
              <CarbonCard data={report} loading={isLoading} />
              <ColorPaletteCard data={report} loading={isLoading} />
              
              <div className="md:col-span-2">
                <BlurReveal label="Reveal complete DNS records">
                  <DNSCard data={report} loading={isLoading} />
                </BlurReveal>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
