export default function DomainCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col justify-between min-h-[180px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Parsing...</div>
      </div>
    );
  }

  const domain = data?.domain;
  
  const formatAge = (days) => {
    if (days === null || days === undefined) return 'Unknown';
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) {
      return (
        <>
          {years}<span className="text-on-surface-variant text-lg">y</span> {months}<span className="text-on-surface-variant text-lg">m</span>
        </>
      );
    }
    return (
      <>
        {months}<span className="text-on-surface-variant text-lg">m</span>
      </>
    );
  };

  return (
    <div className="bento-card col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col justify-between min-h-[180px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Domain Age</h3>
      <div className="font-headline-lg text-headline-lg text-on-surface font-light drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] my-2">
        {formatAge(domain?.age_days)}
      </div>
      <div className="font-mono-data text-mono-data text-on-surface-variant text-xs mt-2 pt-2 border-t border-white/10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        Created: {domain?.created || 'Unknown'}
      </div>
    </div>
  );
}
