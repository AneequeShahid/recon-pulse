export default function NewsCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-5 rounded-xl p-6 flex flex-col min-h-[200px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Searching...</div>
      </div>
    );
  }

  const news = data?.news || [];

  return (
    <div className="bento-card col-span-1 md:col-span-5 rounded-xl p-6 flex flex-col min-h-[200px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant mb-4 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Recent Mentions</h3>
      {news.length > 0 ? (
        <ul className="space-y-4 mt-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {news.slice(0, 2).map((item, index) => (
            <li key={index} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body-md text-sm text-on-surface hover:text-primary transition-colors line-clamp-1 block"
              >
                {item.title}
              </a>
              <span className="font-mono-data text-mono-data text-primary text-xs mt-1 block">
                {item.source} · {item.date}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-black/40 rounded-lg border border-white/5 text-on-surface-variant text-xs font-mono-data">
          No news mentions found
        </div>
      )}
    </div>
  );
}
