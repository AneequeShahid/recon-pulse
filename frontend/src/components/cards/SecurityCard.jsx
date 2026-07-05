export default function SecurityCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Analyzing SSL & headers...</div>
      </div>
    );
  }

  const security = data?.security;
  const gradeColor = (grade) => {
    if (!grade) return 'text-slate-500';
    if (grade.startsWith('A')) return 'text-emerald-400';
    if (grade.startsWith('B')) return 'text-blue-400';
    if (grade.startsWith('C')) return 'text-yellow-400';
    return 'text-rose-500';
  };

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🔒 Security & Headers</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/60 flex flex-col justify-between">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">SSL Certificate</span>
          <div className="my-2">
            <span className={`text-4xl font-extrabold ${gradeColor(security?.ssl_grade)}`}>
              {security?.ssl_grade || '?'}
            </span>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${
            security?.https ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {security?.https ? '✓ HTTPS Active' : '✗ Unencrypted'}
          </span>
        </div>
        <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/60 flex flex-col justify-between">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">HTTP Headers</span>
          <div className="my-2">
            <span className={`text-4xl font-extrabold ${gradeColor(security?.headers_grade)}`}>
              {security?.headers_grade || '?'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">Security Score</span>
        </div>
      </div>
    </div>
  );
}
