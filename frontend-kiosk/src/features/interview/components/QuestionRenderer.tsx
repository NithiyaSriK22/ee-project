import React, { useState } from 'react';
import {
  InterviewQuestionItem,
  QuestionTypes,
} from '../types/interview.types';
import { YesNoInput } from './inputs/YesNoInput';
import { ChoiceInput } from './inputs/ChoiceInput';
import { NumericInput } from './inputs/NumericInput';
import { DurationInput } from './inputs/DurationInput';
import { FreeTextInput } from './inputs/FreeTextInput';
import { DateInput } from './inputs/DateInput';
import { ArrowRight, SkipForward, HelpCircle, Info } from 'lucide-react';
import { useLanguage } from '../../language/useLanguage';
import { QuestionHelpModal } from '../../help/QuestionHelpModal';

interface QuestionRendererProps {
  question: InterviewQuestionItem;
  value: any;
  onChange: (val: any) => void;
  onSubmit: () => void;
  onSkip: () => void;
  isSubmitting?: boolean;
  voiceTranscript?: string;
  onSpeak?: (text: string) => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  onSubmit,
  onSkip,
  isSubmitting = false,
  voiceTranscript,
  onSpeak,
}) => {
  const { currentLanguage, getQuestionPrompt, getQuestionHint, getOptionLabel } = useLanguage();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const translatedPrompt = getQuestionPrompt(question.questionCode, question.promptText);
  const translatedHint = getQuestionHint(question.questionCode, question.promptAudioHint);

  const hasValue =
    value !== undefined &&
    value !== null &&
    value !== '' &&
    (Array.isArray(value) ? value.length > 0 : true);

  // Translate options for choice questions
  const localizedOptions = (question.answerOptions || []).map((opt) => {
    if (typeof opt === 'string') {
      return {
        label: getOptionLabel(opt, opt),
        value: opt,
      };
    }
    return {
      label: getOptionLabel(opt.code || opt.value, opt.label),
      value: opt.value || opt.code || opt.label,
    };
  });

  const renderInput = () => {
    switch (question.questionType) {
      case QuestionTypes.YES_NO:
        return <YesNoInput value={value} onChange={onChange} withDetail={false} />;

      case QuestionTypes.YES_NO_WITH_DETAIL:
        return <YesNoInput value={value} onChange={onChange} withDetail={true} />;

      case QuestionTypes.SINGLE_CHOICE:
        return (
          <ChoiceInput
            options={localizedOptions}
            value={value}
            onChange={onChange}
            isMulti={false}
          />
        );

      case QuestionTypes.MULTI_CHOICE:
        return (
          <ChoiceInput
            options={localizedOptions}
            value={value}
            onChange={onChange}
            isMulti={true}
          />
        );

      case QuestionTypes.NUMERIC:
        return <NumericInput value={value} onChange={onChange} />;

      case QuestionTypes.DURATION:
        return <DurationInput value={value} onChange={onChange} />;

      case QuestionTypes.DATE:
        return <DateInput value={value} onChange={onChange} />;

      case QuestionTypes.FREE_TEXT:
      default:
        return (
          <FreeTextInput
            value={value}
            onChange={onChange}
            voiceTranscript={voiceTranscript}
          />
        );
    }
  };

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-6 animate-fadeIn">
      {/* Question Prompt Title */}
      <div className="text-center space-y-3 px-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
          {translatedPrompt}
        </h1>
        {translatedHint && (
          <p className="text-sm text-slate-400 max-w-lg mx-auto flex items-center justify-center gap-1.5 font-medium">
            <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{translatedHint}</span>
          </p>
        )}

        {/* What does this mean? Explainer Trigger */}
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-sky-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {currentLanguage === 'ta' ? 'இந்த கேள்வியின் விளக்கம்' : 'What does this question mean?'}
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Question Input Component */}
      <div className="w-full flex justify-center py-2">{renderInput()}</div>

      {/* Primary Actions (Confirm & Next, or Skip / Prefer not to answer) */}
      <div className="w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onSkip}
          className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <SkipForward className="w-4 h-4" />
          <span>
            {currentLanguage === 'ta'
              ? 'இந்த கேள்வியைத் தவிர்க்கவும்'
              : 'Skip this question'}
          </span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!hasValue || isSubmitting}
          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-95 min-h-[56px] ${
            hasValue && !isSubmitting
              ? 'bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 shadow-teal-500/20 ring-2 ring-teal-400/50 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          {isSubmitting ? (
            <span>{currentLanguage === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving Answer...'}</span>
          ) : (
            <>
              <span>{currentLanguage === 'ta' ? 'பதிலைச் சேமிக்க' : 'Save & Continue'}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Question Help Modal */}
      {question.questionCode && (
        <QuestionHelpModal
          questionCode={question.questionCode}
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          onSpeak={onSpeak}
        />
      )}
    </div>
  );
};
