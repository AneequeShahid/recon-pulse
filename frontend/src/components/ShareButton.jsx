import { useState } from 'react';

export default function ShareButton({ reportId }) {
  const url = `${window.location.origin}/r/${reportId}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="bg-white/5 border border-white/10 text-primary px-4 py-2 rounded-lg font-title-md text-sm hover:bg-white/10 hover:shadow-[0_0_15px_rgba(173,198,255,0.4)] transition-all drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] backdrop-blur-md cursor-pointer"
    >
      {copied ? '✓ Copied' : 'Share Report'}
    </button>
  );
}
