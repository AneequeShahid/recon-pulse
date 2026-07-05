export default function TechStackCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col h-full min-h-[220px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Detecting tech stack...</div>
      </div>
    );
  }

  const techStack = data?.tech_stack;
  const hasTech = techStack && techStack.technologies && techStack.technologies.length > 0;

  return (
    <div className="bento-card col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col h-full min-h-[220px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant mb-4 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Tech Stack</h3>
      
      {hasTech ? (
        <div className="flex-1 flex flex-col justify-end gap-3 mt-4">
          {Object.entries(techStack.categories).map(([category, techs]) => (
            <div key={category} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-label-sm">{category}</span>
              <div className="flex flex-wrap gap-2">
                {techs.map((tech) => (
                  <span
                    key={tech}
                    className="bg-white/5 text-primary border border-white/10 backdrop-blur-md px-3 py-1 rounded-full font-mono-data text-xs flex items-center gap-2 shadow-[0_4px_10px_rgba(0,0,0,0.2)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_rgba(173,198,255,0.8)]"></span>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center h-32 bg-black/40 rounded-lg border border-white/5 text-on-surface-variant text-xs font-mono-data">
          No technologies detected
        </div>
      )}
    </div>
  );
}
