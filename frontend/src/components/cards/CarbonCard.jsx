export default function CarbonCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center min-h-[180px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Calculating...</div>
      </div>
    );
  }

  const carbon = data?.carbon;

  return (
    <div className="bento-card col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant absolute top-6 left-6 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Carbon Impact</h3>
      
      <div className="mt-6 flex flex-col items-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-md border border-emerald-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <span className="material-symbols-outlined text-emerald-400 text-3xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">eco</span>
        </div>
        <span className="font-title-md text-emerald-400 font-semibold">{carbon?.rating || 'Low'}</span>
        <span className="font-mono-data text-mono-data text-on-surface-variant text-xs mt-1">
          {carbon?.grams_per_view ? `${carbon.grams_per_view}g CO2/visit` : '0.12g CO2/visit'}
        </span>
      </div>
    </div>
  );
}
