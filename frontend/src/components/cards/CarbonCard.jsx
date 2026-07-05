export default function CarbonCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Calculating carbon footprint...</div>
      </div>
    );
  }

  const carbon = data?.carbon;
  
  const ratingColor = (rating) => {
    if (!rating) return 'text-slate-500';
    if (rating.startsWith('A')) return 'text-emerald-400';
    if (rating.startsWith('B')) return 'text-blue-400';
    if (rating.startsWith('C')) return 'text-yellow-400';
    return 'text-rose-500';
  };

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🌱 Carbon Footprint</h3>
      {carbon?.grams_per_view !== null && carbon?.grams_per_view !== undefined ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/60 flex flex-col justify-between">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">CO2 Emissions</span>
            <div className="my-2">
              <span className="text-3xl font-extrabold text-slate-200">
                {carbon.grams_per_view}g
              </span>
            </div>
            <span className="text-[9px] text-slate-400">Grams per page view</span>
          </div>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/60 flex flex-col justify-between">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Rating</span>
            <div className="my-2">
              <span className={`text-4xl font-extrabold ${ratingColor(carbon.rating)}`}>
                {carbon.rating || '?' }
              </span>
            </div>
            <span className="text-[9px] text-slate-400">
              {carbon.cleaner_than !== null ? `Cleaner than ${carbon.cleaner_than}% of web` : 'Website Rating'}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 bg-slate-950/40 rounded-xl border border-slate-800/60 text-slate-500 text-xs">
          Carbon footprint details not available
        </div>
      )}
    </div>
  );
}
