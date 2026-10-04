import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, ChevronRight, KeyRound } from 'lucide-react';
import { SEEDED_AUTHORITIES, sendTestEmail } from '../../api/client';

/**
 * AuthorityLogin - dedicated sign-in screen for the three authority tiers.
 * Shown whenever the Authority Desk is opened without an active session.
 */
export default function AuthorityLogin({
  language = 'en',
  email,
  setEmail,
  password,
  setPassword,
  onLogin,
  loading,
  loginError,
  emailStatus,
}) {
  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState('');

  return (
    <div id="authority-login" className="space-y-6">
      <div className="rounded-[26px] bg-[var(--color-ink)] p-6 text-white shadow-xl shadow-[var(--color-ink)]/10 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
            <KeyRound className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {language === 'hi' ? 'प्राधिकारी लॉगिन' : 'Authority sign-in'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {language === 'hi'
                ? 'अपने स्तर से साइन इन करें — प्रत्येक स्तर को केवल अपनी शिकायत कतार दिखेगी।'
                : 'Sign in with your tier account — each tier opens only its own complaint queue.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">{language === 'hi' ? 'प्राधिकारी लॉगिन' : 'Authority login'}</h3>
          </div>
          <p className="text-xs text-slate-500">
            {language === 'hi'
              ? 'स्तर-1 डेस्क केवल अपने विभाग की शिकायतें देखेगा। स्तर-2 व स्तर-3 सभी विभागों की निगरानी करेंगे।'
              : 'Level-1 desk sees only its own department queue. Level-2 and Level-3 monitor all departments.'}
          </p>
          <form onSubmit={(e) => onLogin(e)} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Official email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            {loginError && <p className="text-xs text-rose-600 font-semibold">{loginError}</p>}
            <button
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-blue)] py-3 text-sm font-bold text-white transition-colors hover:bg-[#3155b8] disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {language === 'hi' ? 'लॉगिन करें' : 'Sign in to desk'}
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Authority accounts — tap a card to sign in</p>
          {SEEDED_AUTHORITIES.map((a) => (
            <button
              key={a.email}
              onClick={(e) => onLogin(e, a)}
              className="w-full text-left bg-white hover:border-indigo-400 border border-slate-200 rounded-2xl p-4 shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.level === 3 ? 'bg-rose-100 text-rose-700' : a.level === 2 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  LEVEL {a.level}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
              </div>
              <p className="text-sm font-bold text-slate-900 mt-1">{language === 'hi' ? a.title_hi : a.title}</p>
              <p className="text-xs font-mono text-indigo-700">{a.email}</p>
              <p className="text-[11px] text-slate-400 font-mono">password: {a.password}</p>
            </button>
          ))}
          <div className="bg-slate-900 text-slate-300 rounded-2xl p-4 text-[11px] leading-relaxed">
            <p className="font-bold text-white mb-1">Isolation rule</p>
            <p>L1 nodal desk (shared mail <span className="font-mono text-amber-300">kumardp2707@gmail.com</span> for all 5 departments) must pick one desk — PWD / Water / Power / Sanitation / Health — and sees only that desk queue. Collector (L2) and CM Office (L3) see every department with Open / In Review / In Progress / Resolved filters.</p>
          </div>
          <div className={`rounded-2xl p-4 text-[11px] border ${emailStatus?.configured ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            <p className="font-bold mb-1">Live email delivery: {emailStatus ? (emailStatus.configured ? `ON via ${emailStatus.provider}` : 'OFF — backend has no SMTP/Brevo key yet') : 'checking…'}</p>
            {!emailStatus?.configured && (
              <p>To switch on: add Gmail App Password (`SMTP_USER` + `SMTP_PASSWORD`) or `BREVO_API_KEY` in backend `.env`, restart API. Free tiers, no card. Test with the box below once configured.</p>
            )}
            <div className="flex gap-2 mt-2">
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="test address" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white" />
              <button
                type="button"
                onClick={async () => {
                  setTestMsg('');
                  try {
                    const r = await sendTestEmail(testTo);
                    setTestMsg(`Delivered via ${r.provider} to ${r.to}.`);
                  } catch (err) {
                    setTestMsg(err.message);
                  }
                }}
                className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Send test
              </button>
            </div>
            {testMsg && <p className="mt-1 font-semibold">{testMsg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
