export default function PerformanceCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Measuring speed performance...</div>
      </div>
    );
  }

  const performance = data?.performance;
  const score = performance?.performance_score;

  const scoreColor = (val) => {
    if (val === null || val === undefined) return 'text-slate-500 border-slate-800';
    if (val >= 90) return 'text-emerald-400 border-emerald-500/30';
    if (val >= 50) return 'text-yellow-400 border-yellow-500/30';
    return 'text-rose-500 border-rose-500/30';
  };

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px] flex flex-col justify-between">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">⚡ Performance</h3>
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${scoreColor(score)} bg-slate-950/40`}>
            <span className="text-2xl font-bold">{score !== null && score !== undefined ? `${score}` : '?'}</span>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">LCP</span>
              <span className="text-sm font-bold text-slate-200 mt-1">{performance?.lcp !== null && performance?.lcp !== undefined ? `${performance?.lcp}s` : '?'}</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">FCP</span>
              <span className="text-sm font-bold text-slate-200 mt-1">{performance?.fcp !== null && performance?.fcp !== undefined ? `${performance?.fcp}s` : '?'}</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">CLS</span>
              <span className="text-sm font-bold text-slate-200 mt-1">{performance?.cls !== null && performance?.cls !== undefined ? `${performance?.cls}` : '?'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
