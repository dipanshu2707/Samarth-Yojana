import React, { useState, useEffect } from 'react';
import { 
  Building2,
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Landmark,
  FileCheck2,
  PhoneCall,
} from 'lucide-react';
import LanguageToggle from './components/LanguageToggle';
import EligibilityForm from './components/EligibilityForm';
import ResultsList from './components/ResultsList';
import DocumentUpload from './components/DocumentUpload';
import GrievancePortal from './components/GrievancePortal';
import HelpdeskChat from './components/HelpdeskChat';
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
    document.documentElement.lang = language;
  }, [language]);

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
    <div className="min-h-screen bg-[var(--color-cloud)] text-[var(--color-ink)] antialiased selection:bg-[var(--color-blue)] selection:text-white lg:flex">
      <aside className="relative z-30 flex w-full flex-col gap-4 bg-[var(--color-ink)] px-4 py-4 text-white lg:sticky lg:top-0 lg:h-screen lg:w-[270px] lg:shrink-0 lg:px-5 lg:py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-blue)] text-white shadow-lg shadow-black/20">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="text-xl font-bold leading-none">MPOnline</div>
            <p className="mt-1 text-[11px] text-white/60">Madhya Pradesh services</p>
          </div>
        </div>

        <nav aria-label="Services" className="grid grid-cols-2 gap-2 lg:mt-12 lg:grid-cols-1">
          <button
            type="button"
            aria-pressed={activeService === 'grievance'}
            onClick={() => setActiveService('grievance')}
            className={`group flex min-h-[62px] items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${activeService === 'grievance' ? 'bg-white text-[var(--color-ink)] shadow-lg shadow-black/10' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeService === 'grievance' ? 'bg-[var(--color-blue)] text-white' : 'bg-white/10 text-[var(--color-sun)]'}`}>
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{language === 'hi' ? 'सीएम ऑनलाइन' : 'CM Online'}</span>
              <span className={`hidden text-[11px] sm:block ${activeService === 'grievance' ? 'text-slate-500' : 'text-white/50'}`}>{language === 'hi' ? 'जन-शिकायत 181' : 'Grievances / 181'}</span>
            </span>
          </button>
          <button
            type="button"
            aria-pressed={activeService === 'yojana'}
            onClick={() => setActiveService('yojana')}
            className={`group flex min-h-[62px] items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${activeService === 'yojana' ? 'bg-white text-[var(--color-ink)] shadow-lg shadow-black/10' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeService === 'yojana' ? 'bg-[var(--color-sea)] text-white' : 'bg-white/10 text-[var(--color-sun)]'}`}>
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{language === 'hi' ? 'योजना साथी' : 'Yojana Sathi'}</span>
              <span className={`hidden text-[11px] sm:block ${activeService === 'yojana' ? 'text-slate-500' : 'text-white/50'}`}>{language === 'hi' ? 'योजनाएं व दस्तावेज़' : 'Schemes / documents'}</span>
            </span>
          </button>
        </nav>

        <div className="mt-auto hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 lg:block">
          <p className="text-xs font-semibold text-white/75">Need help by phone?</p>
          <a href="tel:181" className="mt-2 flex items-center gap-2 text-lg font-bold text-[var(--color-sun)] hover:text-white">
            <PhoneCall className="h-4 w-4" aria-hidden="true" /> 181
          </a>
          <p className="mt-1 text-[11px] text-white/45">Madhya Pradesh CM helpline</p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[#dce4ed] bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#65758b]">{t.govTitle}</p>
              <p className="hidden truncate text-[11px] text-[#8b98a8] sm:block">{t.govSubtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-2 rounded-full bg-[var(--color-cloud)] px-3 py-2 text-xs font-semibold text-[#53647a] md:inline-flex" role="status" aria-live="polite">
                <span className={`h-2 w-2 rounded-full ${systemStatus === 'ok' ? 'bg-[#339f91]' : systemStatus === 'degraded' ? 'bg-[var(--color-sun)]' : 'bg-[#dc6c61]'}`} />
                {systemStatus === 'ok' ? t.statusOnline : systemStatus === 'degraded' ? t.statusDegraded : t.statusOffline}
              </span>
              <a href="tel:181" aria-label={t.helplineText} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff4db] text-[#9a691b] transition-colors hover:bg-[var(--color-sun)] hover:text-[var(--color-ink)] sm:hidden">
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="tel:181" className="hidden items-center gap-2 rounded-full bg-[#fff4db] px-3.5 py-2 text-xs font-bold text-[#805816] transition-colors hover:bg-[var(--color-sun)] sm:inline-flex">
                <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" /> {t.helplineText}
              </a>
              <button
                type="button"
                onClick={goAuthorityLogin}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--color-ink)] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[var(--color-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)] sm:px-4 sm:text-sm"
              >
                <ShieldCheck className="h-4 w-4 text-[var(--color-sun)]" aria-hidden="true" />
                <span className="hidden sm:inline">{language === 'hi' ? 'प्राधिकारी लॉगिन' : 'Officer desk'}</span>
                <span className="sm:hidden">{language === 'hi' ? 'लॉगिन' : 'Officer'}</span>
              </button>
              <LanguageToggle language={language} onToggle={handleLanguageToggle} />
            </div>
          </div>
        </header>

      {/* Main Content Area */}
      <main className="service-view mx-auto w-full max-w-[1500px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
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
            <section className="overflow-hidden rounded-[28px] border border-[#dce4ed] bg-white shadow-sm shadow-[#17243a]/[0.04]">
              <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:p-8">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold text-[var(--color-blue)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#dd9950]" /> योजना साथी / Yojana Sathi
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf5f3] px-2.5 py-1 text-[#277c72]">
                      <ShieldCheck className="h-3.5 w-3.5" /> Rule-based matching
                    </span>
                  </div>

                  <h1 className="mt-5 max-w-3xl text-[30px] font-bold leading-[1.1] text-[var(--color-ink)] sm:text-[38px]">
                    {t.yojanaHeroTitle}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)] sm:text-base">
                    {t.yojanaHeroSubtitle}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#596a80]">
                    <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--color-sea)]" />13+ verified schemes</span>
                    <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--color-blue)]" />OCR document pre-check</span>
                    <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--color-sun)]" />No citizen account</span>
                  </div>
                </div>

                <div className="rounded-[22px] bg-[var(--color-ink)] p-5 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-white/55">Need civic redressal?</p>
                      <p className="mt-1 text-base font-bold">CM Online</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[var(--color-sun)]">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveService('grievance')}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-sun)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span>सीएम ऑनलाइन / MP CM Online</span>
                  </button>
                </div>
              </div>
            </section>

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

      {/* Global Helpdesk AI chat (OpenRouter, guardrailed) */}
      <HelpdeskChat language={language} />

      {/* Executive Footer */}
      <footer className="mt-8 border-t border-[#dce4ed] bg-white py-5 text-xs text-[#64748b]">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <p className="font-bold text-[var(--color-ink)]">Madhya Pradesh citizen services</p>
            <p className="mt-1">CM Online grievance redressal / Yojana Sathi scheme assistance</p>
          </div>
          <p className="flex max-w-2xl items-start gap-2 leading-5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-sea)]" aria-hidden="true" />
            <span>{t.privacyNote}</span>
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
