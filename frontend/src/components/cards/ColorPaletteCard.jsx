export default function ColorPaletteCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bento-card col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col h-full min-h-[220px] animate-pulse">
        <div className="text-slate-500 text-sm font-mono-data">Extracting...</div>
      </div>
    );
  }

  const displayPalette = ['#0a0a0a', '#3b82f6', '#ffffff'];

  return (
    <div className="bento-card col-span-1 md:col-span-4 rounded-xl p-6 flex flex-col h-full min-h-[220px]">
      <h3 className="font-label-sm text-xs text-on-surface-variant mb-4 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Extracted Palette</h3>
      
      <div className="flex gap-4 mt-auto h-20">
        {displayPalette.map((color, index) => (
          <div
            key={index}
            style={{ backgroundColor: color }}
            className="flex-1 rounded-lg border border-white/20 relative group overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)] cursor-pointer"
            onClick={() => navigator.clipboard.writeText(color)}
          >
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
              <span className="font-mono-data text-[10px] text-white select-all">{color}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
