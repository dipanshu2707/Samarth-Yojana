import React from 'react';
import { Languages } from 'lucide-react';

export default function LanguageToggle({ language, onToggle }) {
  return (
    <div className="inline-flex items-center border border-[#d5deda] bg-white p-1">
      <div className="flex items-center px-1.5 text-[#64736e]">
        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">भाषा / Language:</span>
      </div>
      <button
        type="button"
        aria-pressed={language === 'en'}
        onClick={() => onToggle('en')}
        className={`min-h-8 px-2.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#155b4a] ${
          language === 'en'
            ? 'bg-[#155b4a] text-white'
            : 'text-[#52635b] hover:bg-[#f2f5f3] hover:text-[#172a2a]'
        }`}
      >
        English
      </button>
      <button
        type="button"
        aria-pressed={language === 'hi'}
        onClick={() => onToggle('hi')}
        className={`min-h-8 px-2.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#155b4a] ${
          language === 'hi'
            ? 'bg-[#155b4a] text-white'
            : 'text-[#52635b] hover:bg-[#f2f5f3] hover:text-[#172a2a]'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
}
