export default function NewsCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Searching news mentions...</div>
      </div>
    );
  }

  const news = data?.news || [];

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">📰 News Mentions</h3>
      {news.length > 0 ? (
        <div className="flex flex-col gap-3">
          {news.map((item, index) => (
            <a
              key={index}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between border-b border-slate-800/50 pb-2.5 last:border-0 last:pb-0 hover:opacity-90"
            >
              <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-1">
                {item.title}
              </span>
              <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>{item.source}</span>
                <span>{item.date}</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 bg-slate-950/40 rounded-xl border border-slate-800/60 text-slate-500 text-xs">
          No recent news mentions found
        </div>
      )}
    </div>
  );
}
