import React from 'react';
import { UserPlus, UserCheck, Stethoscope, Sparkles, Volume2 } from 'lucide-react';
import { useLanguage } from '../../language/useLanguage';

interface WelcomeStepProps {
  onSelectFlow: (flow: 'new' | 'returning') => void;
  onSpeakPrompt?: (text: string) => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onSelectFlow, onSpeakPrompt }) => {
  const { locale } = useLanguage();

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-700/20">
          <Stethoscope className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2 border border-teal-200">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>{locale.welcomeBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {locale.welcomeHeading}
        </h1>
        <p className="text-base text-slate-600 mt-2">
          {locale.welcomeSubtitle}
        </p>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={() => onSpeakPrompt(locale.welcomeSubtitle)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3.5 py-1.5 rounded-lg border border-teal-200 transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>{locale.welcomeAudioButton}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto pt-2">
        {/* Option 1: New Patient */}
        <button
          type="button"
          onClick={() => onSelectFlow('new')}
          className="p-8 rounded-3xl bg-white border-2 border-slate-200 hover:border-teal-600 hover:bg-teal-50/50 hover:shadow-xl transition-all text-left flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <UserPlus className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-teal-900">
              {locale.welcomeNewPatientTitle}
            </h3>
            <div className="text-sm font-semibold text-teal-700 mt-0.5">
              {locale.welcomeNewPatientSub}
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              {locale.welcomeNewPatientDesc}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700">
            <span>{locale.welcomeNewPatientAction}</span>
            <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
              {locale.welcomeNewPatientBadge}
            </span>
          </div>
        </button>

        {/* Option 2: Returning Patient */}
        <button
          type="button"
          onClick={() => onSelectFlow('returning')}
          className="p-8 rounded-3xl bg-white border-2 border-slate-200 hover:border-teal-600 hover:bg-teal-50/50 hover:shadow-xl transition-all text-left flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-900">
              {locale.welcomeReturningTitle}
            </h3>
            <div className="text-sm font-semibold text-indigo-700 mt-0.5">
              {locale.welcomeReturningSub}
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              {locale.welcomeReturningDesc}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>{locale.welcomeReturningAction}</span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
              {locale.welcomeReturningBadge}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
