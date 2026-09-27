import React from 'react';
import { Languages } from 'lucide-react';

export default function LanguageToggle({ language, onToggle }) {
  return (
    <div className="inline-flex items-center bg-white/90 backdrop-blur-md rounded-full p-1 border border-slate-200 shadow-sm">
      <div className="flex items-center pl-2 pr-1 text-slate-500 text-xs font-medium">
        <Languages className="w-3.5 h-3.5 mr-1 text-emerald-600" />
        <span>भाषा / Lang:</span>
      </div>
      <button
        type="button"
        onClick={() => onToggle('en')}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
          language === 'en'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => onToggle('hi')}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
          language === 'hi'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
}
