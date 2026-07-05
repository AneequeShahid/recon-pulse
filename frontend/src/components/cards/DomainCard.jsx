export default function DomainCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Parsing domain metadata...</div>
      </div>
    );
  }

  const domain = data?.domain;

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🏷️ Domain Info</h3>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between border-b border-slate-800/50 pb-2">
          <span className="text-xs text-slate-400">Registrar</span>
          <span className="text-xs font-semibold text-slate-200">{domain?.registrar || 'Unknown'}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800/50 pb-2">
          <span className="text-xs text-slate-400">Created Date</span>
          <span className="text-xs font-mono text-slate-200">{domain?.created || 'Unknown'}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800/50 pb-2">
          <span className="text-xs text-slate-400">Expires Date</span>
          <span className="text-xs font-mono text-slate-200">{domain?.expires || 'Unknown'}</span>
        </div>
        <div className="flex justify-between pb-1">
          <span className="text-xs text-slate-400">Domain Age</span>
          <span className="text-xs font-semibold text-slate-200">
            {domain?.age_days !== null && domain?.age_days !== undefined ? `${domain.age_days} days` : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}
