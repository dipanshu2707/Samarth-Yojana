import React from 'react';
import { Award, AlertTriangle, ShieldCheck, Info, Sparkles, ArrowLeft } from 'lucide-react';
import SchemeCard from './SchemeCard';

export default function ResultsList({ results, onCheckDocument, onModifyAnswers, language }) {
  const matches = results?.matches || [];
  const possible = results?.possible_but_unconfirmed || [];
  const disclaimer = results?.disclaimer || "This tool gives an informational estimate only. Confirm eligibility and apply on the scheme's official portal.";

  const t = {
    matchesHeading: language === 'hi' ? 'उच्च-पात्रता योजनाएं (You Likely Qualify For)' : 'Schemes You Likely Qualify For',
    possibleHeading: language === 'hi' ? 'संभावित योजनाएं (अतिरिक्त शर्तों की पुष्टि आवश्यक)' : 'Possible Schemes Requiring Additional Confirmation',
    noMatches: language === 'hi' ? 'आपके वर्तमान विवरणों से कोई योजना मेल नहीं खाई।' : 'No direct scheme matches found for the submitted details.',
    noMatchesSub: language === 'hi'
      ? 'कृपया अपनी जानकारी (जैसे आय सीमा या शिक्षा स्तर) संशोधित करके पुनः प्रयास करें।'
      : 'Try modifying details or checking social category and income ceilings.',
    modifyBtn: language === 'hi' ? 'प्रश्नावली में सुधार करें' : 'Modify Answers',
    disclaimerTitle: language === 'hi' ? 'महत्वपूर्ण सूचना व अस्वीकरण (Disclaimer):' : 'Important Advisory & Non-Approval Notice:',
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner with Stats & Back to Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                {language === 'hi' ? 'पात्रता परिणाम' : 'Scheme Eligibility Results'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'hi'
                  ? `${matches.length} योजनाएं सीधे उपयुक्त पाई गईं | ${possible.length} योजनाओं में पुष्टि आवश्यक`
                  : `Found ${matches.length} high-confidence matches and ${possible.length} possible schemes`}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onModifyAnswers}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.modifyBtn}</span>
        </button>
      </div>

      {/* Permanently Visible Official Advisory / Disclaimer Box */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-950 text-xs leading-relaxed shadow-sm">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block mb-0.5">{t.disclaimerTitle}</strong>
          <span>{disclaimer}</span>
        </div>
      </div>

      {/* High-Confidence Matches Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>{t.matchesHeading} ({matches.length})</span>
          </h3>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
            <p className="font-medium text-sm">{t.noMatches}</p>
            <p className="text-xs text-slate-400 mt-1">{t.noMatchesSub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {matches.map((scheme) => (
              <SchemeCard
                key={scheme.scheme_id}
                scheme={scheme}
                onCheckDocument={onCheckDocument}
                language={language}
                isPossible={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Possible but Unconfirmed Section */}
      {possible.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>{t.possibleHeading} ({possible.length})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {possible.map((scheme) => (
              <SchemeCard
                key={scheme.scheme_id}
                scheme={scheme}
                onCheckDocument={onCheckDocument}
                language={language}
                isPossible={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
