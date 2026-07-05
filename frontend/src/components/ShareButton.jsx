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
      className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-900 hover:border-slate-700 transition-all cursor-pointer shadow-md"
    >
      {copied ? '✓ Link copied' : '🔗 Share report'}
    </button>
  );
}
