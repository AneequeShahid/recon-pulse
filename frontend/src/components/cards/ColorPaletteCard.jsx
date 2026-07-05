import { usePalette } from 'color-thief-react';

export default function ColorPaletteCard({ data, loading }) {
  const imageUrl = data?.screenshot_url;
  
  const { data: palette, error } = usePalette(imageUrl, 5, 'hex', {
    crossOrigin: 'anonymous',
    quality: 10
  });

  const displayPalette = !error && palette && palette.length > 0 ? palette : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-64 flex items-center justify-center animate-pulse">
        <div className="text-slate-500 text-sm">Extracting color palette...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 h-full min-h-[220px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🎨 Color Palette</h3>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 w-full h-16 rounded-xl overflow-hidden border border-slate-800/50">
          {displayPalette.map((color, index) => (
            <div
              key={index}
              style={{ backgroundColor: color }}
              className="flex-1 h-full group relative cursor-pointer hover:opacity-90 transition-opacity"
              title={color}
              onClick={() => navigator.clipboard.writeText(color)}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {displayPalette.map((color, index) => (
            <div key={index} className="flex items-center gap-2 bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl justify-between">
              <div className="flex items-center gap-2">
                <div style={{ backgroundColor: color }} className="w-3.5 h-3.5 rounded-md border border-slate-800" />
                <span className="text-xs font-mono text-slate-300 select-all">{color}</span>
              </div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                {index === 0 ? 'Dominant' : `Shade ${index + 1}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
