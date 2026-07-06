interface RemediationCardProps {
  remediationSteps: any[];
  onOpenGuide: () => void;
}

export default function RemediationCard({ remediationSteps, onOpenGuide }: RemediationCardProps) {
  return (
    <div
      data-card="remediation"
      role="button"
      tabIndex={0}
      onClick={onOpenGuide}
      className="rp-bento col-span-1 md:col-span-9 rounded-xl p-6 flex flex-col min-h-[300px] h-[300px]"
      style={{ border: "1px solid rgba(245,158,11,0.2)", boxShadow: "0 0 32px rgba(245,158,11,0.06)" }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" }}
          >
            <span className="mso text-base" style={{ color: "#f59e0b" }}>build</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Remediation Guide</div>
            <div className="text-[10px] text-slate-400 rp-mono">
              {remediationSteps.length} patch{remediationSteps.length !== 1 ? "es" : ""} auto-generated · click any step to copy config
            </div>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenGuide(); }}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer hover:scale-105 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
        >
          Open Patch Guide →
        </button>
      </div>

      {/* Step pills grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto flex-1 min-h-0">
        {remediationSteps.map((step: any, idx: number) => {
          const isSecurity = step.title?.toLowerCase().includes("header");
          const isEmail    = step.title?.toLowerCase().includes("email") || step.title?.toLowerCase().includes("spf") || step.title?.toLowerCase().includes("dmarc");
          const isTLS      = step.title?.toLowerCase().includes("ssl") || step.title?.toLowerCase().includes("tls");
          const isHTTPS    = step.title?.toLowerCase().includes("https") || step.title?.toLowerCase().includes("redirect");
          const isHTTP2    = step.title?.toLowerCase().includes("http/2");
          const color = isTLS ? "#ef4444" : isEmail ? "#8b5cf6" : isSecurity ? "#f97316" : isHTTPS ? "#3b82f6" : isHTTP2 ? "#10b981" : "#f59e0b";
          const icon  = isTLS ? "lock" : isEmail ? "mail" : isSecurity ? "shield" : isHTTPS ? "http" : isHTTP2 ? "speed" : "build";
          const mitre = step.mitre_attack || [];

          return (
            <div
              key={idx}
              onClick={(e) => { e.stopPropagation(); onOpenGuide(); }}
              className="group rounded-lg p-3 border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
              style={{ backgroundColor: `${color}0d`, borderColor: `${color}30` }}
            >
              <div>
                <div className="flex items-start gap-2">
                  <span className="mso text-sm mt-0.5 shrink-0" style={{ color }}>{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white leading-snug truncate">{step.title}</div>
                    <div className="text-[10px] text-slate-400 rp-mono mt-0.5 leading-relaxed line-clamp-2">{step.description}</div>
                  </div>
                </div>
              </div>
              {mitre.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {mitre.slice(0, 2).map((m: any) => (
                    <span
                      key={m.technique_id}
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold rp-mono"
                      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
                    >
                      {m.technique_id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
