import React from 'react';
import {
  InterviewAnswerItem,
  InterviewQuestionItem,
  SectionLabels,
  InterviewSection,
} from '../types/interview.types';
import {
  CheckCircle,
  Edit2,
  Send,
  User,
  Users,
  ShieldCheck,
  Activity,
  ArrowLeft,
} from 'lucide-react';

interface InterviewReviewScreenProps {
  answers: InterviewAnswerItem[];
  allQuestions: InterviewQuestionItem[];
  onEditQuestion: (questionId: string) => void;
  onFinalSubmit: () => void;
  isSubmitting?: boolean;
  onBackToInterview?: () => void;
}

export const InterviewReviewScreen: React.FC<InterviewReviewScreenProps> = ({
  answers,
  allQuestions,
  onEditQuestion,
  onFinalSubmit,
  isSubmitting = false,
  onBackToInterview,
}) => {
  // Map questions by id for easy prompt lookup
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  // Helper to format answer into friendly plain language
  const formatAnswerText = (answer: InterviewAnswerItem) => {
    if (answer.isSkipped) {
      return <span className="text-slate-500 italic">Skipped / Not answered</span>;
    }

    const val = answer.answerValue;
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-500 italic">No response provided</span>;
    }

    if (typeof val === 'object') {
      if (val.value !== undefined) {
        return (
          <span>
            <strong className="text-teal-300">{String(val.value)}</strong>
            {val.detail && <span className="text-slate-300 ml-2">({val.detail})</span>}
            {val.unit && <span className="text-slate-400 ml-1">{val.unit}</span>}
          </span>
        );
      }
      return <span className="text-slate-200">{JSON.stringify(val)}</span>;
    }

    if (Array.isArray(val)) {
      return <span className="text-teal-300 font-semibold">{val.join(', ')}</span>;
    }

    if (typeof val === 'boolean') {
      return <span className="text-teal-300 font-bold">{val ? 'YES' : 'NO'}</span>;
    }

    return <span className="text-slate-200 font-medium">{String(val)}</span>;
  };

  const getProvenanceBadge = (via: string) => {
    switch (via) {
      case 'companion_assisted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Users className="w-3 h-3" /> Companion
          </span>
        );
      case 'staff_assisted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <ShieldCheck className="w-3 h-3" /> Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <User className="w-3 h-3" /> Patient Direct
          </span>
        );
    }
  };

  // Group answers by section
  const sectionGroups: Record<string, InterviewAnswerItem[]> = {};
  answers.forEach((ans) => {
    const q = questionMap.get(ans.questionId);
    const sec = q?.section || ans.section || 'CHIEF_COMPLAINT';
    if (!sectionGroups[sec]) {
      sectionGroups[sec] = [];
    }
    sectionGroups[sec].push(ans);
  });

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 flex flex-col gap-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-teal-400" />
          <span>Interview Review & Confirmation</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Review Your Medical Intake
        </h1>
        <p className="text-base text-slate-300 max-w-lg mx-auto">
          Please check your recorded answers below. You can tap "Edit" on any question to make changes before final submission to the doctor.
        </p>
      </div>

      {/* Answer List Grouped by Section */}
      <div className="space-y-6">
        {Object.entries(sectionGroups).map(([secKey, sectionAnswers]) => {
          const secMeta = SectionLabels[secKey as InterviewSection];
          return (
            <div
              key={secKey}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <Activity className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-300">
                  {secMeta?.title || secKey}
                </h3>
              </div>

              <div className="divide-y divide-slate-800/60 space-y-3">
                {sectionAnswers.map((ans) => {
                  const q = questionMap.get(ans.questionId);
                  const prompt = q?.promptText || ans.promptText || 'Clinical Question';

                  return (
                    <div
                      key={ans.id || ans.questionId}
                      className="pt-3 flex items-start justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-300">{prompt}</p>
                        <div className="text-base font-semibold">{formatAnswerText(ans)}</div>
                        <div className="pt-1">{getProvenanceBadge(ans.answeredVia)}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEditQuestion(ans.questionId)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Edit</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Action Bar */}
      <div className="sticky bottom-4 z-40 p-4 bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {onBackToInterview && (
          <button
            type="button"
            onClick={onBackToInterview}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Interview</span>
          </button>
        )}

        <button
          type="button"
          onClick={onFinalSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto flex-1 max-w-md py-4 px-8 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-extrabold text-lg shadow-xl shadow-teal-500/20 ring-4 ring-teal-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <span>Completing Intake...</span>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Confirm & Complete Medical Intake</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
