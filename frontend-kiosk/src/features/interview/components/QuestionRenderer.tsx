import React from 'react';
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
import { ArrowRight, SkipForward, HelpCircle } from 'lucide-react';

interface QuestionRendererProps {
  question: InterviewQuestionItem;
  value: any;
  onChange: (val: any) => void;
  onSubmit: () => void;
  onSkip: () => void;
  isSubmitting?: boolean;
  voiceTranscript?: string;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  onSubmit,
  onSkip,
  isSubmitting = false,
  voiceTranscript,
}) => {
  const hasValue =
    value !== undefined &&
    value !== null &&
    value !== '' &&
    (Array.isArray(value) ? value.length > 0 : true);

  const renderInput = () => {
    switch (question.questionType) {
      case QuestionTypes.YES_NO:
        return <YesNoInput value={value} onChange={onChange} withDetail={false} />;

      case QuestionTypes.YES_NO_WITH_DETAIL:
        return <YesNoInput value={value} onChange={onChange} withDetail={true} />;

      case QuestionTypes.SINGLE_CHOICE:
        return (
          <ChoiceInput
            options={question.answerOptions || []}
            value={value}
            onChange={onChange}
            isMulti={false}
          />
        );

      case QuestionTypes.MULTI_CHOICE:
        return (
          <ChoiceInput
            options={question.answerOptions || []}
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
    <div className="w-full max-w-3xl flex flex-col items-center gap-8 animate-fadeIn">
      {/* Question Prompt Title */}
      <div className="text-center space-y-3 px-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
          {question.promptText}
        </h1>
        {question.promptAudioHint && (
          <p className="text-sm text-slate-400 max-w-lg mx-auto flex items-center justify-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{question.promptAudioHint}</span>
          </p>
        )}
      </div>

      {/* Dynamic Question Input Component */}
      <div className="w-full flex justify-center py-2">{renderInput()}</div>

      {/* Primary Actions (Confirm & Next, or Skip / Prefer not to answer) */}
      <div className="w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onSkip}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <SkipForward className="w-4 h-4" />
          <span>Skip / Prefer not to answer</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!hasValue || isSubmitting}
          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-95 ${
            hasValue && !isSubmitting
              ? 'bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 shadow-teal-500/20 ring-2 ring-teal-400/50 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          {isSubmitting ? (
            <span>Saving Answer...</span>
          ) : (
            <>
              <span>Save & Continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
