export default function TrafficCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-center min-h-[180px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Traffic Rank...</div>
      </div>
    );
  }

  const traffic = data?.traffic;
  const rank = traffic?.tranco_rank;

  return (
    <div className="bento-card col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-center min-h-[180px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant absolute top-6 left-6 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Traffic Rank</h3>
      <div className="mt-8 flex items-end gap-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <span className="font-display-xl text-3xl text-on-surface font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {rank !== null && rank !== undefined ? `#${rank.toLocaleString()}` : 'Unknown'}
        </span>
        {rank && (
          <span className="font-mono-data text-mono-data text-emerald-400 flex items-center mb-1 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-xs">
            <span className="material-symbols-outlined text-sm mr-1">trending_up</span> Live
          </span>
        )}
      </div>
      <div className="w-full h-1.5 bg-white/10 mt-4 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
        <div 
          className="h-full bg-primary shadow-[0_0_12px_rgba(173,198,255,0.9)] transition-all duration-1000"
          style={{ width: rank ? `${Math.max(10, Math.min(100, 100 - (rank / 100000)))}%` : '10%' }}
        />
      </div>
    </div>
  );
}
