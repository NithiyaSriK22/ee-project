import React from 'react';
import { HelpCircle, Volume2, X } from 'lucide-react';
import { useLanguage } from '../language/useLanguage';

interface QuestionHelpModalProps {
  questionCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSpeak?: (text: string) => void;
}

export const QuestionHelpModal: React.FC<QuestionHelpModalProps> = ({
  questionCode,
  isOpen,
  onClose,
  onSpeak,
}) => {
  const { bundle, currentLanguage, t } = useLanguage();

  if (!isOpen) return null;

  const explanation =
    bundle?.questionHelpTexts?.[questionCode] ||
    t('help.default_explanation', 'This question asks for details to help your OPD physician understand your symptoms. Please answer as best as you can or tap Skip.');

  const handleReadAloud = () => {
    if (onSpeak) {
      onSpeak(explanation);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-sky-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                {currentLanguage === 'ta' ? 'இந்த கேள்வியின் விளக்கம்' : 'What does this question mean?'}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {currentLanguage === 'ta' ? 'மருத்துவர் சரிபார்த்த எளிய விளக்கம்' : 'Clinician-approved plain explanation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close question help"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-sky-50/60 border border-sky-200 text-slate-800 text-base leading-relaxed font-medium">
          {explanation}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={handleReadAloud}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-300 bg-white hover:bg-sky-50 text-sky-700 font-bold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>{currentLanguage === 'ta' ? 'வாசிக்கவும்' : 'Read Aloud'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
          >
            {currentLanguage === 'ta' ? 'புரிந்தது' : 'I Understand'}
          </button>
        </div>
      </div>
    </div>
  );
};
