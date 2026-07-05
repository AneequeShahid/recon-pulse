export default function PerformanceCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center min-h-[180px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Performance...</div>
      </div>
    );
  }

  const performance = data?.performance;
  const score = performance?.performance_score;

  const radius = 45;
  const circumference = 2 * Math.PI * radius; // ~282.7
  const strokeDashoffset = score !== null && score !== undefined
    ? circumference - (score / 100) * circumference
    : circumference;

  return (
    <div className="bento-card col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center min-h-[180px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant absolute top-6 left-6 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Performance</h3>
      <div className="relative w-32 h-32 mt-8 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" fill="none" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="10"></circle>
          <circle
            className="drop-shadow-[0_0_12px_rgba(173,198,255,0.6)] transition-all duration-1000"
            cx="50"
            cy="50"
            fill="none"
            r={radius}
            stroke={score >= 90 ? "#34d399" : score >= 50 ? "#fbbf24" : score ? "#f87171" : "rgba(255,255,255,0.1)"}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeWidth="10"
            strokeLinecap="round"
          ></circle>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="font-headline-lg text-2xl font-bold text-on-surface drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {score !== null && score !== undefined ? `${score}%` : '?'}
          </span>
        </div>
      </div>
    </div>
  );
}
