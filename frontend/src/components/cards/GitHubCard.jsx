export default function GitHubCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Checking GitHub profile...</div>
      </div>
    );
  }

  const github = data?.github;

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🐱 GitHub Presence</h3>
      {github?.exists ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Public Repos</span>
              <div className="text-lg font-bold text-slate-200 mt-1">{github.repos || 0}</div>
            </div>
            <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Followers</span>
              <div className="text-lg font-bold text-slate-200 mt-1">{github.followers || 0}</div>
            </div>
          </div>
          {github.top_repos && github.top_repos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Top Repositories</span>
              <div className="flex flex-wrap gap-1.5">
                {github.top_repos.map((repo) => (
                  <span
                    key={repo}
                    className="text-[11px] px-2 py-0.5 bg-slate-800 border border-slate-700/40 rounded-md text-slate-300 font-mono"
                  >
                    {repo}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 bg-slate-950/40 rounded-xl border border-slate-800/60 text-slate-500 text-xs">
          No matching GitHub profile detected
        </div>
      )}
    </div>
  );
}
