export default function ScreenshotCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Capturing screenshot...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 overflow-hidden flex flex-col justify-between h-full min-h-[300px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">📸 Live Screenshot</h3>
      {data?.screenshot_url ? (
        <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950">
          <img
            src={data.screenshot_url}
            alt="Website Screenshot"
            className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800/80 text-slate-500 text-sm">
          No screenshot captured
        </div>
      )}
    </div>
  );
}
