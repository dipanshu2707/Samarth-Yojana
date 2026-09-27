import React, { useState } from 'react';
import { Upload, FileCheck2, AlertTriangle, XCircle, CheckCircle, ShieldAlert, Sparkles, RefreshCw, X } from 'lucide-react';
import { verifyDocument } from '../api/client';

export default function DocumentUpload({ scheme, documentName, onClose, language }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const t = {
    title: language === 'hi' ? 'दस्तावेज़ तत्परता जांच (Document-Readiness)' : 'Document-Readiness Verification',
    subtitle: language === 'hi'
      ? 'सरकारी कार्यालय जाने से पहले अपने दस्तावेज़ की स्पष्टता और प्रकार की पूर्व-जांच करें।'
      : 'Pre-screen your document photo before visiting the office or submitting online.',
    schemeName: language === 'hi' ? 'संबंधित योजना:' : 'Target Scheme:',
    docLabel: language === 'hi' ? 'आवश्यक दस्तावेज़:' : 'Required Document:',
    dropPrompt: language === 'hi' ? 'फोटो यहाँ खींचें या फाइल चुनें (JPG, PNG, WebP)' : 'Click to browse or drop document photo (JPG, PNG, WebP)',
    maxSize: language === 'hi' ? 'अधिकतम आकार: 5MB' : 'Max size: 5MB',
    btnCheck: language === 'hi' ? 'दस्तावेज़ की जांच करें' : 'Analyze Document Readiness',
    checking: language === 'hi' ? 'AI व OCR द्वारा विश्लेषण जारी है...' : 'Running OCR & AI Vision Inspection...',
    privacy: language === 'hi'
      ? 'डीपीडीपी अधिनियम 2023 अनुपालन: आपकी फाइल केवल मेमोरी में जांची जाती है और तुरंत नष्ट कर दी जाती है। कोई डेटा सेव नहीं होता।'
      : 'DPDP Act 2023 Notice: Uploaded photos are processed strictly in-memory and permanently discarded immediately after analysis. No documents are stored.',
    verdicts: {
      likely_acceptable: language === 'hi' ? 'संभावित रूप से उपयुक्त (Likely Acceptable)' : 'Likely Acceptable',
      needs_review: language === 'hi' ? 'समीक्षा आवश्यक (Needs Review)' : 'Needs Review / Caution',
      likely_wrong_document: language === 'hi' ? 'गलत दस्तावेज़ प्रतीत होता है' : 'Likely Wrong Document',
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(language === 'hi' ? 'फाइल 5MB से बड़ी है। कृपया छोटी फाइल चुनें।' : 'File exceeds 5MB limit.');
      return;
    }

    setError(null);
    setResult(null);
    setSelectedFile(file);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const data = await verifyDocument(selectedFile, documentName, scheme?.scheme_id || '');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Inspection failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getVerdictStyle = (v) => {
    switch (v) {
      case 'likely_acceptable':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'likely_wrong_document':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'needs_review':
      default:
        return 'bg-amber-50 text-amber-800 border-amber-300';
    }
  };

  const getVerdictIcon = (v) => {
    switch (v) {
      case 'likely_acceptable':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'likely_wrong_document':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'needs_review':
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-lg font-heading">{t.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Context box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">{t.schemeName}</span>
              <span className="text-slate-800 font-bold truncate max-w-[250px]">{scheme?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">{t.docLabel}</span>
              <span className="text-emerald-700 font-bold">{documentName}</span>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div>
            <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 transition-all rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer text-center group">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-slate-400 group-hover:text-emerald-600 transition-colors mb-2" />
              <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">
                {selectedFile ? selectedFile.name : t.dropPrompt}
              </span>
              <span className="text-xs text-slate-400 mt-1">{t.maxSize}</span>
            </label>
          </div>

          {/* Preview Image */}
          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-48 flex items-center justify-center bg-slate-100">
              <img src={previewUrl} alt="Document Preview" className="object-contain max-h-48 w-auto" />
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          {selectedFile && !result && (
            <button
              type="button"
              onClick={handleUploadAndAnalyze}
              disabled={isUploading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.checking}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{t.btnCheck}</span>
                </>
              )}
            </button>
          )}

          {/* Inspection Result Presentation */}
          {result && (
            <div className="space-y-3 animate-fadeIn">
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${getVerdictStyle(result.verdict)}`}>
                <div className="flex-shrink-0 mt-0.5">
                  {getVerdictIcon(result.verdict)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      {t.verdicts[result.verdict] || result.verdict}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 font-semibold uppercase">
                      {result.confidence} confidence
                    </span>
                  </div>
                  <p className="text-xs">
                    {language === 'hi' ? 'पहचाना गया प्रकार: ' : 'Detected Type: '}
                    <strong className="capitalize">{result.document_type_detected?.replace(/_/g, ' ')}</strong>
                  </p>
                  <p className="text-xs">
                    {language === 'hi' ? 'सुपाठ्यता (Legibility): ' : 'Legibility: '}
                    <strong className="capitalize">{result.legibility}</strong>
                  </p>
                </div>
              </div>

              {/* Flags and recommendations */}
              {result.flags && result.flags.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl">
                  <span className="text-xs font-bold text-amber-900 block mb-1">
                    {language === 'hi' ? 'महत्वपूर्ण सुझाव / जांच बिंदु:' : 'Important Inspection Flags:'}
                  </span>
                  <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                    {result.flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Text Snippet extracted */}
              {result.extracted_text_snippet && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">
                    {language === 'hi' ? 'पहचाना गया पाठ (OCR Snippet):' : 'Recognized Text Snippet:'}
                  </span>
                  <p className="text-xs text-slate-600 font-mono bg-white p-2 rounded border border-slate-100 line-clamp-3">
                    {result.extracted_text_snippet}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* DPDP Act 2023 Compliance Callout */}
          <div className="flex items-start gap-2 bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl text-emerald-900 text-[11px] leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <span>{t.privacy}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
