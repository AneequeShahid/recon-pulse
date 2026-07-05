import { useState } from 'react';

export default function BlurReveal({ children, label = "Reveal details" }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative w-full h-full">
      <div className={`transition-all duration-500 ${
        revealed ? 'filter-none' : 'blur-md select-none pointer-events-none'
      }`}>
        {children}
      </div>
      {!revealed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 dark:bg-black/40 backdrop-blur-[2px] rounded-xl transition-all">
          <button
            onClick={() => setRevealed(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950/90 text-white rounded-lg text-xs font-semibold shadow-lg hover:bg-slate-900 transition-all border border-slate-800/80 backdrop-blur-md cursor-pointer pointer-events-auto"
          >
            🔓 {label}
          </button>
        </div>
      )}
    </div>
  );
}
