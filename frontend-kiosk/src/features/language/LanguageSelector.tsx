import React from 'react';
import { useLanguage } from './useLanguage';
import { Globe, Mic, Check } from 'lucide-react';

interface LanguageSelectorProps {
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
  const { currentLanguage, setLanguage, availableLanguages, locale } = useLanguage();

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-300">
        <Globe className="w-4 h-4 text-slate-500 ml-1" />
        {availableLanguages.map((lang) => {
          const isSelected = currentLanguage === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang.displayName}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <Globe className="w-4 h-4 text-sky-600" />
        <span>{locale.languageHeading}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {availableLanguages.map((lang) => {
          const isSelected = currentLanguage === lang.code;
          const hasVoice = lang.voiceInputStatus === 'SUPPORTED';

          return (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`relative p-4 rounded-2xl border-3 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                isSelected
                  ? 'bg-sky-50 border-sky-600 shadow-md ring-2 ring-sky-200'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-extrabold text-slate-900">{lang.displayName}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {lang.code === 'en' ? 'English' : lang.code === 'ta' ? 'தமிழ்' : 'हिन्दी'}
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
                {hasVoice ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Mic className="w-3 h-3" /> {locale.languageVoiceTouch}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {locale.languageTouchOnly}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
