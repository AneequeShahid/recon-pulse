export default function TechStackCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Detecting technologies...</div>
      </div>
    );
  }

  const techStack = data?.tech_stack;
  const hasTech = techStack && techStack.technologies && techStack.technologies.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🛠️ Tech Stack</h3>
      {hasTech ? (
        <div className="flex flex-col gap-4">
          {Object.entries(techStack.categories).map(([category, techs]) => (
            <div key={category} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{category}</span>
              <div className="flex flex-wrap gap-2">
                {techs.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-700/50 rounded-lg text-slate-200 font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 bg-slate-950/40 rounded-xl border border-slate-800/60 text-slate-500 text-xs">
          No technologies detected
        </div>
      )}
    </div>
  );
}
