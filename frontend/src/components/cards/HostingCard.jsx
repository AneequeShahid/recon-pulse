export default function HostingCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Locating hosting server...</div>
      </div>
    );
  }

  const hosting = data?.hosting;

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🌐 Hosting & Geo</h3>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between border-b border-slate-800/50 pb-2">
          <span className="text-xs text-slate-400">IP Address</span>
          <span className="text-xs font-mono text-slate-200">{hosting?.ip || 'Unknown'}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800/50 pb-2">
          <span className="text-xs text-slate-400">ISP Provider</span>
          <span className="text-xs font-semibold text-slate-200">{hosting?.isp || 'Unknown'}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800/50 pb-2">
          <span className="text-xs text-slate-400">ASN Identifier</span>
          <span className="text-xs font-mono text-slate-200">{hosting?.asn || 'Unknown'}</span>
        </div>
        <div className="flex justify-between pb-1">
          <span className="text-xs text-slate-400">Location</span>
          <span className="text-xs font-semibold text-slate-200">
            {hosting?.city ? `${hosting.city}, ` : ''}{hosting?.country || 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}
