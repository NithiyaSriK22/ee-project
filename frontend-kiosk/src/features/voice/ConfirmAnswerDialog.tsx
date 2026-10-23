import React from 'react';
import { Check, X, Volume2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../language/useLanguage';

interface ConfirmAnswerDialogProps {
  isOpen: boolean;
  promptText: string;
  confirmedValueLabel: string;
  isCritical?: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onRepeatAudio?: () => void;
}

export const ConfirmAnswerDialog: React.FC<ConfirmAnswerDialogProps> = ({
  isOpen,
  promptText,
  confirmedValueLabel,
  isCritical = false,
  onConfirm,
  onReject,
  onRepeatAudio,
}) => {
  const { currentLanguage } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-sky-400 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
            {isCritical ? <AlertTriangle className="w-7 h-7 text-amber-500" /> : <Volume2 className="w-7 h-7 text-sky-600" />}
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              {currentLanguage === 'ta' ? 'பதிலை உறுதிப்படுத்தவும்' : 'Confirm Your Spoken Answer'}
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              {isCritical
                ? (currentLanguage === 'ta' ? 'முக்கியமான மருத்துவ கேள்வி — சரிபார்த்தல் அவசியம்' : 'Critical clinical question — confirmation required')
                : (currentLanguage === 'ta' ? 'நீங்கள் கூறிய பதில்' : 'Spoken recognition')}
            </p>
          </div>
        </div>

        <div className="my-6 p-5 rounded-2xl bg-sky-50 border-2 border-sky-200 text-center">
          <p className="text-sm font-semibold text-slate-600 mb-2">
            {promptText || (currentLanguage === 'ta' ? 'நீங்கள் கூறியது:' : 'You said:')}
          </p>
          <div className="text-2xl font-black text-sky-900">
            "{confirmedValueLabel}"
          </div>
        </div>

        {onRepeatAudio && (
          <div className="flex justify-center mb-6">
            <button
              onClick={onRepeatAudio}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              <Volume2 className="w-4 h-4 text-sky-600" />
              <span>{currentLanguage === 'ta' ? 'மீண்டும் கேட்க' : 'Replay audio'}</span>
            </button>
          </div>
        )}

        {/* Large Accessible Yes / No Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onReject}
            className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border-3 border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-lg transition-all cursor-pointer shadow-xs min-h-[64px]"
            aria-label="No, that is incorrect"
          >
            <X className="w-6 h-6 stroke-[3]" />
            <span>{currentLanguage === 'ta' ? 'இல்லை (மாற்று)' : 'No (Change)'}</span>
          </button>

          <button
            onClick={onConfirm}
            className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border-3 border-emerald-500 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-lg transition-all cursor-pointer shadow-md min-h-[64px]"
            aria-label="Yes, that is correct"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>{currentLanguage === 'ta' ? 'ஆம், சரி' : 'Yes, Correct'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
