import React, { useEffect, useState } from 'react';
import { InterviewSection, SectionLabels } from '../types/interview.types';
import {
  Activity,
  Clock,
  FileText,
  Pill,
  AlertTriangle,
  Heart,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface SectionTransitionBannerProps {
  section: InterviewSection;
  onContinue?: () => void;
  autoDismissMs?: number;
}

const sectionIconMap: Record<InterviewSection, React.ReactNode> = {
  CHIEF_COMPLAINT: <Activity className="w-12 h-12 text-teal-400" />,
  PRESENT_ILLNESS_HISTORY: <Clock className="w-12 h-12 text-sky-400" />,
  PAST_MEDICAL_HISTORY: <FileText className="w-12 h-12 text-indigo-400" />,
  MEDICATIONS: <Pill className="w-12 h-12 text-purple-400" />,
  ALLERGIES: <AlertTriangle className="w-12 h-12 text-amber-400" />,
  LIFESTYLE: <Heart className="w-12 h-12 text-rose-400" />,
  FAMILY_HISTORY: <Users className="w-12 h-12 text-emerald-400" />,
};

export const SectionTransitionBanner: React.FC<SectionTransitionBannerProps> = ({
  section,
  onContinue,
  autoDismissMs = 3000,
}) => {
  const meta = SectionLabels[section];
  const [secondsRemaining, setSecondsRemaining] = useState(Math.round(autoDismissMs / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onContinue) onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onContinue]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn">
      <div className="max-w-xl w-full bg-slate-900 border border-teal-500/30 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-2xl bg-teal-950/60 border border-teal-500/40 flex items-center justify-center shadow-inner">
          {sectionIconMap[section] || <CheckCircle2 className="w-12 h-12 text-teal-400" />}
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest text-teal-400 uppercase bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            Next Medical Section
          </span>
          <h2 className="text-3xl font-bold text-white tracking-tight">{meta?.title || section}</h2>
          <p className="text-base text-slate-300 max-w-md mx-auto">{meta?.subtitle}</p>
        </div>

        <div className="w-full pt-4 flex flex-col items-center gap-3">
          <button
            onClick={onContinue}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <span>Continue to Questions</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <span className="text-xs text-slate-400">
            Auto-advancing in {secondsRemaining} second{secondsRemaining !== 1 ? 's' : ''}...
          </span>
        </div>
      </div>
    </div>
  );
};
