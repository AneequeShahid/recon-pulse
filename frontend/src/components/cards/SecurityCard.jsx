export default function SecurityCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center min-h-[180px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data font-semibold">Security Grade...</div>
      </div>
    );
  }

  const security = data?.security;
  const gradeColor = (grade) => {
    if (!grade) return 'text-slate-500';
    if (grade.startsWith('A')) return 'text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.5)]';
    if (grade.startsWith('B')) return 'text-blue-400 drop-shadow-[0_0_25px_rgba(96,165,250,0.5)]';
    if (grade.startsWith('C')) return 'text-yellow-400 drop-shadow-[0_0_25px_rgba(251,191,36,0.5)]';
    return 'text-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.5)]';
  };

  return (
    <div className="bento-card col-span-1 md:col-span-3 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant absolute top-6 left-6 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Security Grade</h3>
      <div className={`font-display-xl text-[80px] leading-none font-bold ${gradeColor(security?.ssl_grade)} mt-8`}>
        {security?.ssl_grade || '?'}
      </div>
    </div>
  );
}
