export default function DNSCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Querying DNS records...</div>
      </div>
    );
  }

  const dns = data?.dns_records || {};
  const hasRecords = Object.values(dns).some(arr => arr && arr.length > 0);

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🛡️ DNS Records</h3>
      {hasRecords ? (
        <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
          {Object.entries(dns).map(([type, records]) => {
            if (!records || records.length === 0) return null;
            return (
              <div key={type} className="flex flex-col gap-1 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{type}</span>
                <div className="flex flex-col gap-1">
                  {records.map((rec, idx) => (
                    <span key={idx} className="text-xs font-mono text-slate-300 break-all select-all">
                      {rec}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 bg-slate-950/40 rounded-xl border border-slate-800/60 text-slate-500 text-xs">
          No DNS records resolved
        </div>
      )}
    </div>
  );
}
