import React from 'react';
import { ExternalLink, CheckCircle2, AlertCircle, FileText, Gift, Building2, UploadCloud, ChevronRight } from 'lucide-react';

export default function SchemeCard({ scheme, onCheckDocument, language, isPossible = false }) {
  const t = {
    benefits: language === 'hi' ? 'योजना के लाभ (Benefits):' : 'Key Scheme Benefits:',
    requiredDocs: language === 'hi' ? 'आवश्यक दस्तावेज़ (Required Documents):' : 'Required Documents Checklist:',
    whyQualify: language === 'hi' ? 'आप क्यों पात्र हैं:' : 'Why You Qualify:',
    officialPortal: language === 'hi' ? 'आधिकारिक पोर्टल पर आवेदन करें' : 'Verify & Apply on Official Portal',
    checkDocBtn: language === 'hi' ? 'दस्तावेज़ जांचें' : 'Check Readiness',
    missingInfo: language === 'hi' ? 'अतिरिक्त जानकारी जो मदद करेगी:' : 'Missing Information That Would Sharpen Match:',
    highConfidence: language === 'hi' ? 'उच्च संभावना (High Confidence)' : 'High Confidence Match',
    possibleMatch: language === 'hi' ? 'संभावित (पुष्टि आवश्यक)' : 'Possible Match (Needs Details)',
  };

  return (
    <article className={`overflow-hidden border-b border-l-2 transition-colors ${
      isPossible
        ? 'border-amber-200 bg-white'
        : 'border-[#d5deda] border-l-[#155b4a] bg-white'
    }`}>
      {/* Top Header */}
      <div className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isPossible
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-[#eaf0ff] text-[#3155b8] border border-[#cfdbff]'
            }`}>
              {isPossible ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isPossible ? t.possibleMatch : t.highConfidence}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              ID: {scheme.scheme_id}
            </span>
          </div>

          {/* Official Portal Link */}
          {scheme.official_portal && (
            <a
              href={scheme.official_portal.split(' ')[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-blue)] hover:underline"
            >
              <span>{t.officialPortal}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Scheme Title */}
        <h3 className="text-lg font-bold text-slate-900 leading-snug">
          {scheme.name}
        </h3>
      </div>

      {/* Body content */}
      <div className="space-y-4 px-5 pb-5 text-sm">
        {/* Plain Language Reason - AI or Rule-based */}
        <div className="border-l-2 border-[#78b9ae] bg-[#f2f7f4] p-3.5">
          <span className="mb-1 block text-xs font-bold text-[#277c72]">
            {t.whyQualify}
          </span>
          <p className="text-xs leading-relaxed text-[var(--color-ink)] md:text-sm">
            {scheme.plain_language_reason}
          </p>
        </div>

        {/* Benefits Section */}
        {scheme.benefits && (
          <div className="flex items-start gap-2 text-slate-700">
            <Gift className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm">
              <strong className="text-slate-900 font-semibold">{t.benefits} </strong>
              <span>{scheme.benefits}</span>
            </div>
          </div>
        )}

        {/* Missing Info if unconfirmed */}
        {scheme.missing_info_that_would_help && scheme.missing_info_that_would_help.length > 0 && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs">
            <span className="font-bold text-amber-900 block mb-1">{t.missingInfo}</span>
            <ul className="list-disc list-inside text-amber-800 space-y-0.5">
              {scheme.missing_info_that_would_help.map((info, idx) => (
                <li key={idx}>{info}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Required Documents Checklist with Document Checker CTA */}
        {scheme.required_documents && scheme.required_documents.length > 0 && (
          <div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              {t.requiredDocs}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scheme.required_documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border border-slate-200/70 bg-slate-50 p-2 transition-colors hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-700 font-medium truncate">{doc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCheckDocument(scheme, doc)}
                    className="inline-flex min-h-8 flex-shrink-0 items-center gap-1 border border-[#b7c9c0] bg-white px-2 py-1 text-[11px] font-bold text-[#155b4a] transition-colors hover:bg-[#edf3ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#155b4a]"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>{t.checkDocBtn}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
