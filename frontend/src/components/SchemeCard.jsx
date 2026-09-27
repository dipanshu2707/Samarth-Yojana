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
    <div className={`rounded-2xl transition-all duration-200 border overflow-hidden ${
      isPossible
        ? 'bg-amber-50/30 border-amber-200/80 hover:border-amber-300'
        : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300'
    }`}>
      {/* Top Header */}
      <div className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isPossible
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {isPossible ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isPossible ? t.possibleMatch : t.highConfidence}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              ID: {scheme.scheme_id}
            </span>
          </div>

          {/* Official Portal Link */}
          {scheme.official_portal && (
            <a
              href={scheme.official_portal.split(' ')[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
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
      <div className="px-5 pb-5 space-y-4 text-sm">
        {/* Plain Language Reason - AI or Rule-based */}
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5">
          <span className="text-xs font-bold text-emerald-900 block mb-1">
            {t.whyQualify}
          </span>
          <p className="text-emerald-950 text-xs md:text-sm leading-relaxed">
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
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-700 font-medium truncate">{doc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCheckDocument(scheme, doc)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex-shrink-0 transition-colors"
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
    </div>
  );
}
