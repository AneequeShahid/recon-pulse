export default function GitHubCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-center min-h-[180px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Querying...</div>
      </div>
    );
  }

  const github = data?.github;

  return (
    <div className="bento-card col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col justify-center min-h-[180px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant absolute top-6 left-6 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">GitHub Activity</h3>
      
      {github?.exists ? (
        <div className="flex gap-8 mt-8 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant mb-1">
              <span className="material-symbols-outlined text-sm text-primary/70">star</span>
              <span className="font-label-sm text-[11px] font-semibold text-slate-500">Repos</span>
            </div>
            <div className="font-headline-lg text-2xl font-bold text-on-surface drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {github.repos || 0}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant mb-1">
              <span className="material-symbols-outlined text-sm text-primary/70">group</span>
              <span className="font-label-sm text-[11px] font-semibold text-slate-500">Followers</span>
            </div>
            <div className="font-headline-lg text-2xl font-bold text-on-surface drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {github.followers || 0}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-black/40 rounded-lg border border-white/5 text-on-surface-variant text-xs font-mono-data mt-4">
          No GitHub profile found
        </div>
      )}
    </div>
  );
}
