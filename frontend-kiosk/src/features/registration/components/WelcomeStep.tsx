import React from 'react';
import { UserPlus, UserCheck, Stethoscope, Sparkles, Volume2 } from 'lucide-react';

interface WelcomeStepProps {
  onSelectFlow: (flow: 'new' | 'returning') => void;
  onSpeakPrompt?: (text: string) => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onSelectFlow, onSpeakPrompt }) => {
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-700/20">
          <Stethoscope className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2 border border-teal-200">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Automated OPD Case-Taking & Triage</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Welcome to Hospital Outpatient Kiosk
        </h1>
        <p className="text-base text-slate-600 mt-2">
          மருத்துவமனை வெளிநோயாளி பிரிவு — உங்கள் விவரங்களை பதிவு செய்து மருத்துவரை அணுகவும்.
        </p>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={() =>
              onSpeakPrompt(
                'Welcome to MediKiosk. Touch the screen to register as a new patient or enter your hospital registration number.'
              )
            }
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3.5 py-1.5 rounded-lg border border-teal-200 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            <span>Listen Voice Instructions</span>
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
              New Patient
            </h3>
            <div className="text-sm font-semibold text-teal-700 mt-0.5">
              புதிய நோயாளி பதிவு
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              First time visiting this hospital. Enter basic demographic information to receive your hospital registration number.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700">
            <span>Start New Registration →</span>
            <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200">No password needed</span>
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
              Returning Patient
            </h3>
            <div className="text-sm font-semibold text-indigo-700 mt-0.5">
              ஏற்கனவே பதிவு செய்தவர்
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Already have a hospital registration card or patient registration number (e.g. MK-2026-XXXXXX).
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>Enter Hospital ID →</span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">Fast lookup</span>
          </div>
        </button>
      </div>
    </div>
  );
};
