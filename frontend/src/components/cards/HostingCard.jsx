export default function HostingCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-6 rounded-xl p-6 flex flex-col justify-center min-h-[180px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Locating...</div>
      </div>
    );
  }

  const hosting = data?.hosting;

  return (
    <div className="bento-card col-span-1 md:col-span-6 rounded-xl p-6 flex flex-col justify-center min-h-[180px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant absolute top-6 left-6 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Hosting Info</h3>
      <div className="mt-8 font-mono-data text-mono-data space-y-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <div className="flex justify-between border-b border-white/10 pb-2">
          <span className="text-on-surface-variant">ISP Provider</span>
          <span className="text-on-surface text-xs font-semibold">{hosting?.isp || 'Unknown'}</span>
        </div>
        <div className="flex justify-between border-b border-white/10 pb-2">
          <span className="text-on-surface-variant">Location</span>
          <span className="text-on-surface text-xs font-semibold">
            {hosting?.city ? `${hosting.city}, ` : ''}{hosting?.country || 'Unknown'}
          </span>
        </div>
        <div className="flex justify-between border-b border-white/10 pb-2">
          <span className="text-on-surface-variant">IP Address</span>
          <span className="text-primary drop-shadow-[0_0_8px_rgba(173,198,255,0.6)] text-xs font-bold">{hosting?.ip || 'Unknown'}</span>
        </div>
      </div>
    </div>
  );
}
