import { useMemo } from 'react';

interface FindingsTableCardProps {
  findings: any[];
}

export default function FindingsTableCard({ findings }: FindingsTableCardProps) {
  const sortedFindings = useMemo(() => {
    return [...findings].sort((a: any, b: any) => {
      const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
    });
  }, [findings]);

  const severityCounts = useMemo(() => {
    return {
      Critical: findings.filter((f: any) => f.severity === 'Critical').length,
      High: findings.filter((f: any) => f.severity === 'High').length,
      Medium: findings.filter((f: any) => f.severity === 'Medium').length,
    };
  }, [findings]);

  return (
    <div
      className="rp-bento col-span-1 md:col-span-12 rounded-xl p-6 flex flex-col min-h-[300px] h-[300px]"
      style={{ border: "1px solid rgba(239,68,68,0.15)", boxShadow: "0 0 24px rgba(239,68,68,0.04)" }}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" }}
          >
            <span className="mso text-base" style={{ color: "#ef4444" }}>security</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Active Findings</div>
            <div className="text-[10px] text-slate-400 rp-mono">
              {severityCounts.Critical} critical · {severityCounts.High} high · {severityCounts.Medium} medium
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {['Critical', 'High', 'Medium', 'Low'].map(sev => {
            const count = findings.filter((f: any) => f.severity === sev).length;
            if (!count) return null;
            const colors: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#6b7280' };
            const c = colors[sev];
            return (
              <span key={sev} className="text-[10px] px-2 py-0.5 rounded rp-mono font-semibold"
                style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}33` }}>
                {sev}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-12 gap-0 bg-white/5 px-4 py-2 text-[10px] text-slate-400 rp-mono uppercase tracking-wide shrink-0">
          <div className="col-span-1">Severity</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-3">Source</div>
          <div className="col-span-2">MITRE</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        <div className="divide-y divide-white/5 overflow-y-auto flex-1 min-h-0">
          {sortedFindings.map((finding: any, i: number) => {
            const colors: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#6b7280', Info: '#3b82f6' };
            const c = colors[finding.severity] || '#6b7280';
            return (
              <div key={finding.id || i} className="grid grid-cols-12 gap-0 px-4 py-2.5 text-xs hover:bg-white/[0.03] transition-colors items-center">
                <div className="col-span-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold rp-mono"
                    style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}30` }}>
                    {finding.severity?.[0] || '?'}
                  </span>
                </div>
                <div className="col-span-5 text-white font-medium truncate pr-3">{finding.title}</div>
                <div className="col-span-3 text-slate-400 rp-mono text-[10px] truncate">{finding.source || '—'}</div>
                <div className="col-span-2">
                  {finding.mitre_technique_id ? (
                    <span className="text-[9px] rp-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {finding.mitre_technique_id}
                    </span>
                  ) : <span className="text-slate-600 text-[10px]">—</span>}
                </div>
                <div className="col-span-1 text-right">
                  {finding.is_promoted ? (
                    <span className="text-[9px] rp-mono text-purple-400">In Case</span>
                  ) : (
                    <span className="text-[9px] rp-mono text-slate-500">Open</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
