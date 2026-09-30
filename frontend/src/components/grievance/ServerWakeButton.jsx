import React, { useState } from 'react';
import { BedDouble, RefreshCw, CheckCircle2 } from 'lucide-react';

/**
 * ServerWakeButton - Render's free tier sleeps after idle. This polls
 * GET /health until the backend answers, with live attempt feedback.
 * Works locally and in production (same-origin /health, proxied).
 */
export default function ServerWakeButton({ language = 'en', compact = false }) {
  const [waking, setWaking] = useState(false);
  const [note, setNote] = useState('');
  const [awake, setAwake] = useState(false);

  const wake = async () => {
    setWaking(true);
    setAwake(false);
    for (let i = 1; i <= 12; i += 1) {
      setNote(language === 'hi' ? `सर्वर जगाया जा रहा… प्रयास ${i}/12` : `Waking server… attempt ${i}/12`);
      try {
        const r = await fetch('/health', { signal: AbortSignal.timeout(10000) });
        if (r.ok) {
          setNote(language === 'hi' ? 'सर्वर तैयार — डेटा पुनः लोड करें' : 'Server awake — reload your data');
          setAwake(true);
          setWaking(false);
          return;
        }
      } catch {
        // asleep - wait and retry
      }
      await new Promise((res) => setTimeout(res, 8000));
    }
    setNote(language === 'hi' ? 'सर्वर अभी सो रहा है — एक मिनट बाद पुनः प्रयास करें' : 'Still asleep — try again in a minute');
    setWaking(false);
  };

  if (compact) {
    return (
      <button
        onClick={wake}
        disabled={waking}
        title={note || 'Wake server'}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-60"
      >
        {waking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : awake ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <BedDouble className="w-3.5 h-3.5" />}
        <span>{waking ? note : awake ? note : language === 'hi' ? 'सर्वर जगाएं' : 'Wake server'}</span>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={wake}
        disabled={waking}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-xs font-bold shadow transition-all disabled:opacity-60"
      >
        {waking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BedDouble className="w-3.5 h-3.5" />}
        <span>{language === 'hi' ? 'सर्वर जगाएं' : 'Wake up server'}</span>
      </button>
      {note && <p className="text-[11px] text-slate-300">{note}</p>}
    </div>
  );
}
