import { useState } from 'react';

export default function BlurReveal({ children, label = "Classified intelligence data", icon = "lock" }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative w-full h-full">
      <div className={`transition-all duration-500 ${
        revealed ? 'filter-none' : 'blur-md select-none pointer-events-none'
      }`}>
        {children}
      </div>
      {!revealed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0f0f0f]/85 backdrop-blur-[20px] rounded-xl transition-all border border-white/5">
          <span className="material-symbols-outlined text-primary mb-2 text-4xl drop-shadow-[0_0_8px_rgba(173,198,255,0.5)]">{icon}</span>
          <p className="font-mono-data text-mono-data text-white text-xs mb-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{label}</p>
          <button
            onClick={() => setRevealed(true)}
            className="bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded font-label-sm text-xs hover:bg-white/20 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-md cursor-pointer pointer-events-auto"
          >
            Reveal
          </button>
        </div>
      )}
    </div>
  );
}
