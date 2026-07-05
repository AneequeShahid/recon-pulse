export default function ScreenshotCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-8 rounded-xl p-6 min-h-[400px] flex items-center justify-center animate-pulse shimmer-effect">
        <div className="text-slate-500 text-sm font-mono-data">Capturing screenshot...</div>
      </div>
    );
  }

  return (
    <div className="bento-card col-span-1 md:col-span-8 rounded-xl p-6 min-h-[400px] flex flex-col">
      <h3 className="font-label-sm text-xs text-on-surface-variant mb-4 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Screenshot Preview</h3>
      <div className="flex-1 bg-black/40 rounded-lg border border-white/5 overflow-hidden relative backdrop-blur-sm">
        {data?.screenshot_url ? (
          <>
            <img
              src={data.screenshot_url}
              alt="Site Screenshot"
              className="w-full h-full object-cover opacity-90 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-transparent to-transparent"></div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm font-mono-data">
            No screenshot captured
          </div>
        )}
      </div>
    </div>
  );
}
