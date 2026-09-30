import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Building2,
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  HeartHandshake,
  Layers,
  ArrowRight,
  Landmark,
  FileCheck2,
  PhoneCall,
  ChevronRight,
  Globe2
} from 'lucide-react';
import LanguageToggle from './components/LanguageToggle';
import EligibilityForm from './components/EligibilityForm';
import ResultsList from './components/ResultsList';
import DocumentUpload from './components/DocumentUpload';
import GrievancePortal from './components/GrievancePortal';
import { checkSystemHealth, submitEligibilityMatch } from './api/client';

export default function App() {
  const [language, setLanguage] = useState('en');
  // 'grievance' = MP CM Online Portal | 'yojana' = Yojana Sathi Scheme Assistant
  const [activeService, setActiveService] = useState('grievance');
  const [systemStatus, setSystemStatus] = useState('checking'); // 'ok' | 'degraded' | 'offline'
  const [lastProfile, setLastProfile] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Document Checker Modal state for Yojana Sathi
  const [activeDocCheck, setActiveDocCheck] = useState(null); // { scheme, documentName }

  // Deep-link into the grievance Authority Desk login screen
  const [officerSignal, setOfficerSignal] = useState(0);
  const goAuthorityLogin = () => {
    setActiveService('grievance');
    setOfficerSignal((s) => s + 1);
  };

  // Check backend health on initial mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const health = await checkSystemHealth();
        if (health.status === 'ok') {
          setSystemStatus('ok');
        } else if (health.status === 'degraded') {
          setSystemStatus('degraded');
        } else {
          setSystemStatus('offline');
        }
      } catch {
        setSystemStatus('offline');
      }
    }
    checkHealth();
  }, []);

  // When language is toggled and Yojana Sathi results are loaded, refresh explanations in that language
  const handleLanguageToggle = async (newLang) => {
    setLanguage(newLang);
    if (activeService === 'yojana' && results && lastProfile) {
      setIsLoading(true);
      try {
        const data = await submitEligibilityMatch({ ...lastProfile, language: newLang });
        setResults(data);
      } catch (err) {
        console.error('Failed to re-match with new language:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFormSubmit = async (profileData) => {
    setIsLoading(true);
    setError(null);
    setLastProfile(profileData);

    try {
      const data = await submitEligibilityMatch({ ...profileData, language });
      setResults(data);
    } catch (err) {
      setError(err.message || 'Unable to calculate scheme eligibility. Please check that backend services are active.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDocCheck = (scheme, documentName) => {
    setActiveDocCheck({ scheme, documentName });
  };

  const handleCloseDocCheck = () => {
    setActiveDocCheck(null);
  };

  const t = {
    govTitle: language === 'hi' ? 'मध्य प्रदेश शासन' : 'Government of Madhya Pradesh',
    govSubtitle: language === 'hi' ? 'नागरिक सेवा एवं लोक शिकायत प्रबंधन' : 'Citizen Public Services & Grievance Governance',
    serviceGrievance: language === 'hi' ? '🏛️ सीएम ऑनलाइन (जन-शिकायत 181)' : '🏛️ MP CM Online (Grievance)',
    serviceYojana: language === 'hi' ? '📜 योजना साथी (कल्याणकारी योजनाएं)' : '📜 Yojana Sathi (Schemes & OCR)',
    badgeHackathon: 'MPOnline Idea & Innovation Hackathon 2026',
    statusOnline: language === 'hi' ? 'सेवाएं ऑनलाइन' : 'Services Online',
    statusDegraded: language === 'hi' ? 'बैकअप मोड' : 'Fallback Active',
    statusOffline: language === 'hi' ? 'ऑफ़लाइन' : 'Backend Offline',
    helplineText: language === 'hi' ? 'सीएम हेल्पलाइन: 181 (टोल-फ्री)' : 'CM Helpline: 181 (Toll-Free)',
    yojanaHeroTitle: language === 'hi' 
      ? 'मध्य प्रदेश जन-कल्याण एवं छात्रवृत्ति पात्रता व दस्तावेज़-सत्यापन सहायक' 
      : 'AI Scheme Eligibility & Pre-screening Document Readiness Assistant',
    yojanaHeroSubtitle: language === 'hi'
      ? 'सही योजना का चयन करें, आवश्यक दस्तावेज़ पहले ही जांचें, और बिना किसी भ्रम के आवेदन करें।'
      : 'Match 13+ MP & Central welfare schemes and pre-screen your documents with OCR/Vision AI before office visits.',
    privacyNote: language === 'hi'
      ? 'गोपनीयता आश्वासन: डीपीडीपी अधिनियम 2023 के तहत व्यक्तिगत डेटा स्थायी रूप से संग्रहीत नहीं किया जाता है।'
      : 'Privacy Assured: DPDP Act 2023 compliant. Transient memory processing with immutable audit logs.',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Supreme Government Header Banner */}
      <div className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              {t.govTitle} • {t.govSubtitle}
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:inline text-slate-400">
              {t.badgeHackathon}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="tel:181" 
              className="hidden sm:flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold transition-colors"
            >
              <PhoneCall className="w-3 h-3" />
              <span>{t.helplineText}</span>
            </a>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                systemStatus === 'ok' ? 'bg-emerald-400 animate-pulse' :
                systemStatus === 'degraded' ? 'bg-amber-400' : 'bg-rose-400'
              }`} />
              <span className="text-slate-400 text-[10px] hidden sm:inline">
                {systemStatus === 'ok' ? t.statusOnline :
                 systemStatus === 'degraded' ? t.statusDegraded : t.statusOffline}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar with Dual Service Tabs */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 flex items-center justify-center text-white shadow-md shadow-indigo-900/20 border border-slate-800">
              <Landmark className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-heading">
                  MP<span className="text-indigo-600">Online</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 hidden sm:inline-block">
                  GovTech 2026
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden md:block">
                Unified Citizen Redressal & Welfare Portal
              </p>
            </div>
          </div>

          {/* Center Service Switcher Navigation Tabs */}
          <nav className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveService('grievance')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeService === 'grievance'
                  ? 'bg-white text-indigo-900 shadow-md shadow-slate-200/80 ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className={`w-4 h-4 ${activeService === 'grievance' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{t.serviceGrievance}</span>
              {activeService === 'grievance' && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse hidden sm:inline-block"></span>
              )}
            </button>

            <button
              onClick={() => setActiveService('yojana')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeService === 'yojana'
                  ? 'bg-white text-emerald-900 shadow-md shadow-slate-200/80 ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileCheck2 className={`w-4 h-4 ${activeService === 'yojana' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{t.serviceYojana}</span>
              {activeService === 'yojana' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse hidden sm:inline-block"></span>
              )}
            </button>
          </nav>

          {/* Right Controls: Authority login + Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={goAuthorityLogin}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{language === 'hi' ? 'प्राधिकारी लॉगिन' : 'Authority Login'}</span>
            </button>
            <LanguageToggle language={language} onToggle={handleLanguageToggle} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* SERVICE 1: MP CM ONLINE GRIEVANCE REDRESSAL PORTAL */}
        {activeService === 'grievance' && (
          <GrievancePortal 
            language={language}
            onSwitchToYojana={() => setActiveService('yojana')}
            officerSignal={officerSignal}
          />
        )}

        {/* SERVICE 2: YOJANA SATHI WELFARE SCHEME & OCR PRE-SCREENER */}
        {activeService === 'yojana' && (
          <div className="space-y-6">
            {/* Yojana Sathi Header Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-800">
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      योजना साथी (Yojana Sathi)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Zero Hallucination Rule-Based Engine
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-white">
                    {t.yojanaHeroTitle}
                  </h1>
                  <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
                    {t.yojanaHeroSubtitle}
                  </p>
                </div>

                {/* Quick Switch to CM Online pill */}
                <div className="flex-shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center space-y-2">
                  <p className="text-xs text-emerald-100">Need Civic Redressal?</p>
                  <button
                    onClick={() => setActiveService('grievance')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    <span>सीएम ऑनलाइन (MP CM Online)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pillars */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-emerald-800/80 text-xs">
                <div className="flex items-center gap-2 text-emerald-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span>13+ MP & Central Welfare Schemes</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-100">
                  <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                  <span>Pre-Screening OCR & Vision AI</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-100">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span>DPDP Act 2023 Zero-Storage</span>
                </div>
              </div>
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="px-3 py-1 bg-white border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Dynamic View: Form vs Results */}
            {!results ? (
              <EligibilityForm 
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                language={language}
              />
            ) : (
              <ResultsList 
                results={results}
                onCheckDocument={handleOpenDocCheck}
                onModifyAnswers={() => setResults(null)}
                language={language}
              />
            )}
          </div>
        )}
      </main>

      {/* Document Check Modal for Yojana Sathi */}
      {activeDocCheck && (
        <DocumentUpload
          scheme={activeDocCheck.scheme}
          documentName={activeDocCheck.documentName}
          onClose={handleCloseDocCheck}
          language={language}
        />
      )}

      {/* Executive Footer */}
      <footer className="mt-12 bg-white border-t border-slate-200/80 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <p className="font-bold text-slate-800 text-sm">
              Madhya Pradesh Citizen Redressal & Scheme Portal
            </p>
            <p className="text-[11px] text-slate-500">
              MPOnline Idea & Innovation Hackathon 2026 • Challenge 5: AI Innovation for Public Services & Citizen-Centric Governance
            </p>
            <p className="text-[11px] text-slate-400">
              Integrated Services: MP CM Online (Helpline 181 • 3-Tier Escalation) & Yojana Sathi (Scheme Eligibility & Document AI)
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-indigo-800 bg-indigo-50/80 px-4 py-2 rounded-2xl border border-indigo-200/70">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-indigo-600" />
            <span>{t.privacyNote}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
