import React from 'react';
import {
  InterviewSection,
  SectionLabels,
} from '../types/interview.types';
import {
  Activity,
  Clock,
  FileText,
  Pill,
  AlertTriangle,
  Heart,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface InterviewProgressBarProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  percentage: number;
  currentSection?: InterviewSection;
  isCritical?: boolean;
}

const sectionIconMap: Record<InterviewSection, React.ReactNode> = {
  CHIEF_COMPLAINT: <Activity className="w-5 h-5 text-teal-400" />,
  PRESENT_ILLNESS_HISTORY: <Clock className="w-5 h-5 text-sky-400" />,
  PAST_MEDICAL_HISTORY: <FileText className="w-5 h-5 text-indigo-400" />,
  MEDICATIONS: <Pill className="w-5 h-5 text-purple-400" />,
  ALLERGIES: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  LIFESTYLE: <Heart className="w-5 h-5 text-rose-400" />,
  FAMILY_HISTORY: <Users className="w-5 h-5 text-emerald-400" />,
};

export const InterviewProgressBar: React.FC<InterviewProgressBarProps> = ({
  currentQuestionIndex,
  totalQuestions,
  percentage,
  currentSection,
  isCritical,
}) => {
  const sectionMeta = currentSection ? SectionLabels[currentSection] : null;

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        {/* Top line info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentSection && (
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                {sectionIconMap[currentSection] || <Activity className="w-5 h-5 text-teal-400" />}
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Section: {sectionMeta ? sectionMeta.title : 'Intake'}
              </span>
              <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <span>
                  Question {currentQuestionIndex} of ~{totalQuestions}
                </span>
                {isCritical && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    <ShieldAlert className="w-3.5 h-3.5" /> High Clinical Importance
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold text-teal-400">{percentage}%</span>
            <span className="text-xs text-slate-400 block">completed</span>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/50">
          <div
            className="bg-gradient-to-r from-teal-500 to-sky-400 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, Math.min(100, percentage))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
