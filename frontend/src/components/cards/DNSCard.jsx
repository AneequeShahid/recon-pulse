export default function DNSCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-5 rounded-xl p-6 flex flex-col min-h-[220px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Resolving...</div>
      </div>
    );
  }

  const dns = data?.dns_records || {};
  const hasRecords = Object.values(dns).some(arr => arr && arr.length > 0);

  return (
    <div className="bento-card col-span-1 md:col-span-5 rounded-xl p-6 flex flex-col min-h-[220px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant absolute top-6 left-6 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">DNS Records</h3>
      
      {hasRecords ? (
        <div className="mt-8 font-mono-data text-mono-data space-y-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-h-48 overflow-y-auto pr-1">
          {Object.entries(dns).map(([type, records]) => {
            if (!records || records.length === 0) return null;
            return (
              <div key={type} className="flex items-start justify-between border-b border-white/10 pb-2 last:border-0 last:pb-0">
                <span className="bg-white/10 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded text-[10px] text-primary shadow-sm uppercase font-bold mr-4">
                  {type}
                </span>
                <span className="text-on-surface text-xs font-mono break-all text-right select-all">
                  {records[0]}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-black/40 rounded-lg border border-white/5 text-on-surface-variant text-xs font-mono-data mt-4">
          No DNS records resolved
        </div>
      )}
    </div>
  );
}
