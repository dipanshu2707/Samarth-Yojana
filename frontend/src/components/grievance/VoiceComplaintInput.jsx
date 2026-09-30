import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, AudioLines, Languages } from 'lucide-react';

/**
 * VoiceComplaintInput - live speech-to-text for complaint filing plus
 * short audio memo capture. Uses the browser SpeechRecognition API when
 * available and MediaRecorder for the memo clip.
 */
export default function VoiceComplaintInput({ language = 'en', onTranscript, onAudioClip, initialTranscript = '' }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState(initialTranscript || '');
  const [audioUrl, setAudioUrl] = useState(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const recogRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(SR));
    return () => {
      try { recogRef.current?.stop(); } catch { /* noop */ }
      try { mediaRef.current?.stream?.getTracks()?.forEach((t) => t.stop()); } catch { /* noop */ }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setTranscript(initialTranscript || '');
  }, [initialTranscript]);

  const pushTranscript = (next) => {
    setTranscript(next);
    onTranscript?.(next);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recog.interimResults = true;
    recog.continuous = true;
    recog.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const part = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += part + ' ';
        else interimText += part;
      }
      setInterim(interimText);
      if (finalText) {
        const merged = `${transcript} ${finalText}`.trim();
        pushTranscript(merged);
      }
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    recog.start();
    setListening(true);
    startAudioClip();
  };

  const stopListening = () => {
    try { recogRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
    setInterim('');
    stopAudioClip();
  };

  const startAudioClip = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onAudioClip?.(url);
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mediaRef.current = rec;
      rec.start();
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      // microphone permission denied - transcription still works
    }
  };

  const stopAudioClip = () => {
    try {
      if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
      else if (timerRef.current) clearInterval(timerRef.current);
    } catch { /* noop */ }
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AudioLines className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">
            {language === 'hi' ? 'आवाज़ से शिकायत लिखें (वॉइस इनपुट)' : 'Speak your complaint (voice input)'}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${supported ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
          {supported ? (language === 'hi' ? 'लाइव ट्रांसक्रिप्शन उपलब्ध' : 'Live transcription ready') : (language === 'hi' ? 'मैनुअल मोड' : 'Manual mode')}
        </span>
      </div>

      {!supported && (
        <p className="text-[11px] text-slate-500">
          {language === 'hi'
            ? 'इस ब्राउज़र में लाइव वॉइस टाइपिंग उपलब्ध नहीं है। कृपया नीचे विवरण टाइप करें — फिर भी शिकायत दर्ज हो जाएगी।'
            : 'Live voice typing is unavailable in this browser. Type the description below — the complaint will still be filed.'}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (listening ? stopListening() : startListening())}
          disabled={!supported}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-40 ${listening ? 'bg-rose-600 text-white animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          title={listening ? 'Stop' : 'Speak'}
        >
          {listening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-700">
            {listening
              ? `${language === 'hi' ? 'सुन रहे हैं' : 'Listening'}… 00:${String(recSeconds).padStart(2, '0')} — ${language === 'hi' ? 'बोलना जारी रखें' : 'keep speaking'}`
              : transcript
                ? (language === 'hi' ? 'वॉइस नोट दर्ज — नीचे पाठ जांचें' : 'Voice captured — review text below')
                : (language === 'hi' ? 'माइक दबाकर शिकायत बोलें' : 'Tap the mic and speak your complaint')}
          </p>
          {interim && <p className="text-[11px] text-indigo-600 italic mt-0.5">…{interim}</p>}
        </div>
      </div>

      {(transcript || audioUrl) && (
        <div className="space-y-2">
          {transcript && (
            <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
              <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Languages className="w-3 h-3" /> {language === 'hi' ? 'प्रतिलेख (ट्रांसक्रिप्ट)' : 'Transcript'}
              </p>
              <p className="italic">“{transcript}”</p>
              <button type="button" onClick={() => pushTranscript('')} className="mt-1 text-[11px] font-bold text-rose-600 hover:underline">
                {language === 'hi' ? 'साफ़ करें' : 'Clear'}
              </button>
            </div>
          )}
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full h-9" />
          )}
        </div>
      )}
    </div>
  );
}
