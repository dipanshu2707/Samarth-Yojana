import React, { useEffect, useRef, useState } from 'react';
import { MessageCircleQuestion, X, Send, Paperclip, ShieldCheck, Loader2, Sparkles, Brain, ChevronDown } from 'lucide-react';
import { sendHelpdeskMessage, streamHelpdeskMessage, verifyDocument, fetchHelpdeskStatus } from '../api/client';

const QUICK_CHIPS = [
  { en: 'Am I eligible for Ladli Behna?', hi: 'क्या मैं लाड़ली बहना के लिए पात्र हूँ?' },
  { en: 'Documents for Gaon Ki Beti?', hi: 'गांव की बेटी के दस्तावेज़?' },
  { en: 'How do I file a complaint?', hi: 'शिकायत कैसे दर्ज करूँ?' },
  { en: 'How do I track my ticket?', hi: 'टिकट कैसे ट्रैक करूँ?' },
];

const DOC_TYPES = [
  'income_certificate', 'caste_certificate', 'domicile_certificate',
  'marksheet', 'aadhaar_card', 'samagra_id', 'bank_passbook', 'ration_card',
];

// ---------- Markdown rendering (XSS-safe: HTML is escaped first) ----------

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(s) {
  let h = escapeHtml(s);
  h = h.replace(/```[\s\S]*?```/g, (m) => `<pre><code>${m.slice(3, -3).replace(/^\w+\n/, '')}</code></pre>`);
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, t, u) => {
    const safe = escapeHtml(u);
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  });
  h = h.replace(/(^|\s)(https?:\/\/[^\s)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return h;
}

export function renderMarkdown(src) {
  const text = String(src ?? '');
  const lines = text.split('\n');
  let html = '';
  let i = 0;
  const flushPara = (buf) => {
    if (buf.length) html += `<p>${buf.map(renderInline).join('<br/>')}</p>`;
  };
  let para = [];
  while (i < lines.length) {
    const line = lines[i];
    const trim = line.trim();
    if (/^```/.test(trim)) {
      flushPara(para); para = [];
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(escapeHtml(lines[i])); i += 1; }
      html += `<pre><code>${buf.join('\n')}</code></pre>`;
      i += 1;
      continue;
    }
    const head = trim.match(/^(#{1,4})\s+(.*)$/);
    if (head) {
      flushPara(para); para = [];
      const level = head[1].length;
      html += `<h${level}>${renderInline(head[2])}</h${level}>`;
      i += 1;
      continue;
    }
    const ol = trim.match(/^(\d+)[.)]\s+(.*)$/);
    const ul = trim.match(/^[-*•]\s+(.*)$/);
    if (ol || ul) {
      flushPara(para); para = [];
      const ordered = Boolean(ol);
      const items = [];
      while (i < lines.length) {
        const t2 = lines[i].trim();
        const m2 = ordered ? t2.match(/^\d+[.)]\s+(.*)$/) : t2.match(/^[-*•]\s+(.*)$/);
        if (!m2) break;
        items.push(`<li>${renderInline(m2[1] || m2[2] || '')}</li>`);
        i += 1;
      }
      html += ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`;
      continue;
    }
    if (trim === '') {
      flushPara(para); para = [];
      i += 1;
      continue;
    }
    para.push(line);
    i += 1;
  }
  flushPara(para);
  return html || '<p></p>';
}

export function parseAgentTags(content) {
  let clean = String(content ?? '');
  let options = [];
  const optMatch = clean.match(/\[\[OPTIONS:\s*([^\]]+)\]\]/);
  if (optMatch) {
    options = optMatch[1].split('|').map((o) => o.trim()).filter(Boolean).slice(0, 4);
    clean = clean.replace(optMatch[0], '').trim();
  }
  clean = clean.replace(/\[\[SEARCH:[^\]]*\]\]/g, '').trim();
  return { clean, options };
}

// ---------- Component ----------

export default function HelpdeskChat({ language = 'en' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [docType, setDocType] = useState('income_certificate');
  const [status, setStatus] = useState(null);
  // True when the running backend predates the streaming agent (no
  // helpdesk_version>=2 capability) or the /stream route 404s — the UI
  // then tells the user to restart the backend instead of silently
  // degrading to instant replies.
  const [outdated, setOutdated] = useState(false);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    fetchHelpdeskStatus()
      .then((s) => {
        setStatus(s);
        if (!(s && s.stream && (s.helpdesk_version || 0) >= 2)) setOutdated(true);
      })
      .catch(() => setStatus({ configured: false }));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const push = (msg) => setMessages((m) => [...m, msg]);
  const patchLast = (fn) => setMessages((m) => m.map((x, idx) => (idx === m.length - 1 ? fn(x) : x)));

  const historyForApi = () => messages
    .filter((m) => !m.streaming || (m.content && m.content.trim()))
    .map((m) => ({ role: m.role, content: (m.display || m.content || '').slice(0, 1000) }));

  const finalizeAssistant = (meta) => {
    patchLast((m) => {
      // If the stream never produced tokens (e.g. backend-side fallback),
      // the full reply arrives inside the done event — use it.
      const raw = (m.content && m.content.trim()) ? m.content : (meta?.reply || '');
      const { clean, options } = parseAgentTags(raw);
      return {
        ...m,
        content: raw,
        display: clean,
        options,
        streaming: false,
        thinkingOpen: false,
        guardrail: meta?.guardrail_triggered,
        fallback: meta?.fallback,
        schemes: meta?.suggested_schemes,
        searched: meta?.searched,
      };
    });
  };

  const runStream = async (msg, history, extra = {}) => new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let tokenStarted = false;
    streamHelpdeskMessage({
      message: msg,
      language,
      history,
      docContext: extra.docContext || null,
      signal: ctrl.signal,
      onThinking: (text) => {
        if (!text) return;
        patchLast((m) => {
          if (!m.streaming || tokenStarted) return m;
          const thinking = [...(m.thinking || [])];
          if (thinking[thinking.length - 1] !== text) thinking.push(text);
          return { ...m, thinking: thinking.slice(-6), thinkingOpen: true };
        });
      },
      onToken: (text) => {
        if (!text) return;
        if (!tokenStarted) {
          tokenStarted = true;
          // Hide the thinking stream as soon as the answer starts streaming.
          patchLast((m) => ({ ...m, thinkingOpen: false, streamed: true }));
        }
        patchLast((m) => ({ ...m, content: `${m.content || ''}${text}` }));
      },
    }).then((meta) => resolve(meta)).catch((err) => reject(err));
  });

  const runSend = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    const history = [...historyForApi(), { role: 'user', content: msg }];
    push({ role: 'user', content: msg, display: msg });
    push({ role: 'assistant', content: '', display: '', thinking: [], thinkingOpen: true, streaming: true, options: [] });
    setBusy(true);
    try {
      const meta = await runStream(msg, history.slice(0, -1));
      finalizeAssistant(meta || {});
    } catch (err) {
      if (err?.code === 'STREAM_UNSUPPORTED') setOutdated(true);
      // Streaming failed (network/SSE) — fall back to the non-streaming endpoint.
      try {
        const res = await sendHelpdeskMessage({ message: msg, language, history: history.slice(0, -1) });
        patchLast(() => {
          const { clean, options } = parseAgentTags(res.reply || '');
          return {
            role: 'assistant', content: res.reply, display: clean, options,
            thinking: [], thinkingOpen: false, streaming: false,
            guardrail: res.guardrail_triggered, fallback: res.fallback, schemes: res.suggested_schemes,
          };
        });
      } catch (err) {
        patchLast((m) => ({
          ...m,
          content: language === 'hi' ? `क्षमा करें, उत्तर नहीं मिल सका: ${err.message}` : `Sorry, I could not reply: ${err.message}`,
          display: language === 'hi' ? `क्षमा करें, उत्तर नहीं मिल सका: ${err.message}` : `Sorry, I could not reply: ${err.message}`,
          options: [], streaming: false, thinkingOpen: false,
        }));
      }
    } finally {
      setBusy(false);
    }
  };

  const runUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    push({
      role: 'user',
      content: language === 'hi' ? `📎 दस्तावेज़ अपलोड: ${file.name} (${docType})` : `📎 Uploaded document: ${file.name} (${docType})`,
      display: language === 'hi' ? `📎 दस्तावेज़ अपलोड: ${file.name} (${docType})` : `📎 Uploaded document: ${file.name} (${docType})`,
    });
    setVerifying(true);
    try {
      const verdict = await verifyDocument(file, docType, '');
      const summary = language === 'hi'
        ? `जांच परिणाम: ${verdict.verdict} • पठनीयता: ${verdict.legibility} • मिला: ${verdict.document_type_detected}`
        : `Check result: ${verdict.verdict} • legibility: ${verdict.legibility} • detected: ${verdict.document_type_detected}`;
      const flags = (verdict.flags || []).slice(0, 3).map((f) => `• ${f}`).join('\n');
      push({
        role: 'assistant', content: `${summary}\n${flags}`, display: `${summary}\n${flags}`,
        thinking: [], thinkingOpen: false, streaming: false, options: [],
      });
      const followUp = language === 'hi'
        ? `मेरे ${docType} की जांच का यह परिणाम समझाएं और आगे क्या करूं बताएं।`
        : `Please explain this verification result for my ${docType} and tell me the next steps.`;
      const history = historyForApi();
      push({ role: 'assistant', content: '', display: '', thinking: [], thinkingOpen: true, streaming: true, options: [] });
      setBusy(true);
      try {
        const meta = await runStream(followUp, history, { docContext: verdict });
        finalizeAssistant(meta || {});
      } finally {
        setBusy(false);
      }
    } catch (err) {
      push({
        role: 'assistant',
        content: language === 'hi' ? `दस्तावेज़ जांच विफल: ${err.message}` : `Document check failed: ${err.message}`,
        display: language === 'hi' ? `दस्तावेज़ जांच विफल: ${err.message}` : `Document check failed: ${err.message}`,
        thinking: [], thinkingOpen: false, streaming: false, options: [],
      });
    } finally {
      setVerifying(false);
    }
  };

  const toggleThinking = (idx) => setMessages((m) => m.map((x, i) => (i === idx ? { ...x, thinkingOpen: !x.thinkingOpen } : x)));

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open helpdesk chat"
          className="fixed bottom-5 right-5 z-[2000] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <MessageCircleQuestion className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-[2000] flex h-[min(640px,calc(100vh-40px))] w-[min(410px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">{language === 'hi' ? 'सहायता चैट' : 'Helpdesk AI'}</p>
                <p className="text-[11px] text-white/60">
                  {status
                    ? <span className="text-emerald-300">● {language === 'hi' ? 'ऑनलाइन' : 'Online'}</span>
                    : (language === 'hi' ? 'जुड़ रहा है…' : 'connecting…')}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => { abortRef.current?.abort(); setOpen(false); }} aria-label="Close chat"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            {language === 'hi'
              ? 'केवल योजना + शिकायत सहायता • आधिकारिक पोर्टल पर सत्यापित करें'
              : 'Schemes + grievance help only • verify on official portal'}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {outdated && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <p className="font-bold">⚠ {language === 'hi' ? 'बैकेंड पुराना है — लाइव स्ट्रीमिंग बंद है' : 'Backend is outdated — live streaming off'}</p>
                <p className="mt-1">
                  {language === 'hi'
                    ? 'सोच-प्रक्रिया, लाइव उत्तर और वेब खोज के लिए बैकेंड को रीस्टार्ट करें (run_local.ps1 / run_local.sh दोबारा चलाएं)। तब तक सीधे उत्तर दिख रहे हैं।'
                    : 'Restart the backend (re-run run_local.ps1 / run_local.sh) to enable thinking, live token streaming and web search. Replies are direct until then.'}
                </p>
              </div>
            )}
            {messages.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                {language === 'hi'
                  ? 'नमस्ते! मैं योजना पात्रता, दस्तावेज़ जांच और शिकायत (टिकट/181) में मदद करता हूँ। नीचे से कोई सवाल चुनें या अपना सवाल लिखें। दस्तावेज़ की फोटो भी अपलोड कर सकते हैं।'
                  : 'Hello! I help with scheme eligibility, document pre-checks and grievances (tickets/181). Pick a question below or type your own. You can also upload a document photo.'}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_CHIPS.map((c) => (
                    <button key={c.en} type="button" onClick={() => runSend(language === 'hi' ? c.hi : c.en)}
                      className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white">
                      {language === 'hi' ? c.hi : c.en}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-5 ${
                  m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}>
                  {m.role === 'assistant' && m.thinking?.length > 0 && (
                    <div className="mb-1.5">
                      {m.thinkingOpen ? (
                        <div className="rounded-xl bg-white/80 px-2.5 py-2 text-[11px] text-slate-500">
                          <p className="mb-1 flex items-center gap-1 font-bold text-indigo-700">
                            <Brain className="h-3 w-3" />
                            {language === 'hi' ? 'सोच रहा हूँ…' : 'Thinking…'}
                            <span className="ml-1 flex gap-0.5">
                              <span className="think-dot h-1 w-1 rounded-full bg-indigo-500" />
                              <span className="think-dot h-1 w-1 rounded-full bg-indigo-500" />
                              <span className="think-dot h-1 w-1 rounded-full bg-indigo-500" />
                            </span>
                          </p>
                          {m.thinking.map((t, ti) => (
                            <p key={ti} className="flex gap-1.5"><span>›</span><span>{t}</span></p>
                          ))}
                        </div>
                      ) : (
                        <button type="button" onClick={() => toggleThinking(i)}
                          className="mb-1 flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-indigo-700">
                          <Brain className="h-3 w-3" /> {language === 'hi' ? 'विचार-प्रक्रिया देखें' : 'View reasoning'}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {m.display || m.content ? (
                    <div className="chat-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.display || m.content) }} />
                  ) : (
                    m.streaming && <span className="flex gap-1 py-1"><span className="think-dot h-1.5 w-1.5 rounded-full bg-slate-400" /><span className="think-dot h-1.5 w-1.5 rounded-full bg-slate-400" /><span className="think-dot h-1.5 w-1.5 rounded-full bg-slate-400" /></span>
                  )}
                  {(m.options?.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.options.map((o) => (
                        <button key={o} type="button" onClick={() => runSend(o)} disabled={busy}
                          className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.guardrail && (
                    <p className="mt-1 text-[10px] font-bold opacity-70">🛡 {language === 'hi' ? 'दायरा-रक्षा सक्रिय' : 'guardrail applied'}</p>
                  )}
                  {m.fallback && (
                    <p className="mt-1 text-[10px] font-bold opacity-70">⚠ {language === 'hi' ? 'ऑफ़लाइन नियम-आधारित उत्तर' : 'offline rule-based answer'}</p>
                  )}
                  {m.searched && (
                    <p className="mt-1 text-[10px] font-bold opacity-70">🌐 {language === 'hi' ? 'आधिकारिक स्रोतों से सत्यापित' : 'verified with official sources'}</p>
                  )}
                  {!m.streaming && (m.content || m.display) && (
                    <p className="mt-1 text-[10px] font-bold opacity-50">
                      {m.streamed
                        ? <span className="text-emerald-600">● {language === 'hi' ? 'लाइव' : 'live'}</span>
                        : <span>↯ {language === 'hi' ? 'सीधा उत्तर' : 'direct reply'}</span>}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {(busy || verifying) && messages[messages.length - 1]?.streaming !== true && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {verifying ? (language === 'hi' ? 'दस्तावेज़ जांची जा रही है…' : 'Verifying document…')
                  : (language === 'hi' ? 'उत्तर लिखा जा रहा है…' : 'Typing…')}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 p-2.5">
            <div className="mb-2 flex items-center gap-1.5">
              <select value={docType} onChange={(e) => setDocType(e.target.value)}
                className="max-w-[180px] truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600">
                {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={verifying || busy}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:border-indigo-400 disabled:opacity-50">
                <Paperclip className="h-3.5 w-3.5" /> {language === 'hi' ? 'फोटो' : 'Photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={runUpload} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); runSend(); }} className="flex gap-1.5">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={language === 'hi' ? 'अपना सवाल लिखें…' : 'Type your question…'}
                maxLength={2000}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
