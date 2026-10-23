import React from 'react';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../types/registration.types';
import { Check, Volume2, Globe } from 'lucide-react';
import { useLanguage } from '../../language/useLanguage';

interface LanguageSelectionStepProps {
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onSpeakPrompt?: (text: string) => void;
}

export const LanguageSelectionStep: React.FC<LanguageSelectionStepProps> = ({
  selectedLanguage,
  onSelectLanguage,
  onSpeakPrompt,
}) => {
  const { locale, setLanguage } = useLanguage();

  const handleLanguagePick = (code: SupportedLanguage) => {
    setLanguage(code);
    onSelectLanguage(code);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2 border border-teal-200">
          <Globe className="w-4 h-4" />
          <span>{locale.languageBadge}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {locale.languageHeading}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {locale.languageSubtitle}
        </p>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={() => onSpeakPrompt(locale.languageSubtitle)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{locale.languageAudioButton}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguagePick(lang.code)}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'border-teal-600 bg-teal-50/70 shadow-md ring-2 ring-teal-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {lang.flagHint}
                </span>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              <div>
                <div className="text-xl font-bold text-slate-900 tracking-tight">{lang.nativeName}</div>
                <div className="text-xs font-medium text-slate-500">{lang.name}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
