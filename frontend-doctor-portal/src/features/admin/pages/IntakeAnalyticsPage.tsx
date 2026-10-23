import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { ArrowRightCircle, HelpCircle } from 'lucide-react';

interface Props {
  preset: string;
}

export const IntakeAnalyticsPage: React.FC<Props> = ({ preset }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-intake', preset],
    queryFn: () => adminConsoleApi.getIntakeAnalytics({ preset }),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading intake analytics...</div>;
  }

  const { sessionsSummary, abandonmentByStep, questionSkipRates } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900">Kiosk & Guided Interview Intake Analytics</h2>
        <p className="text-xs text-slate-500">
          Tracking question-level skip/decline rates and abandonment steps to refine interview templates. No patient IDs or individual responses are tracked.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Companion-Assisted Intake</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            {sessionsSummary.companionAssistedSharePercent}%
          </div>
          <span className="text-2xs text-slate-400">Share of total completed sessions</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Avg Questions / Completed Interview</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {sessionsSummary.averageQuestionsPerCompletedInterview}
          </div>
          <span className="text-2xs text-slate-400">Adaptive tree traversal depth</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Document Rescan Rate</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {data.documentRescanRatePercent}%
          </div>
          <span className="text-2xs text-slate-400">Average {data.documentsScannedPerVisitAverage} scans per visit</span>
        </div>
      </div>

      {/* Abandonment By Step & Question Skip Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abandonment by Step */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ArrowRightCircle className="w-4 h-4 text-rose-500" />
              <span>Session Abandonment by Intake Step</span>
            </h3>
            <span className="text-2xs text-slate-500">Small groups &lt; 10 suppressed</span>
          </div>
          <div className="space-y-2">
            {abandonmentByStep.map((stepItem: any) => (
              <div key={stepItem.step} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 text-xs">
                <span className="font-medium text-slate-700">{stepItem.step}</span>
                <span className={`font-bold ${stepItem.isSuppressed ? 'text-slate-400 italic font-normal' : 'text-slate-900'}`}>
                  {stepItem.displayCount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Question-Level Skip and Decline Rates */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>Highest Question Skip / Decline Rates</span>
            </h3>
            <span className="text-2xs text-slate-500">Template refinement signal</span>
          </div>
          <div className="space-y-2">
            {questionSkipRates.map((q: any) => (
              <div key={q.questionCode} className="py-2 px-3 rounded-lg bg-slate-50 text-xs flex justify-between items-center">
                <div>
                  <span className="font-mono text-2xs text-slate-500 block">{q.questionCode}</span>
                  <span className="text-2xs text-slate-400">Prompted {q.totalPrompted} times</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-700">{q.skipRatePercent}%</span>
                  <span className="text-2xs text-slate-400 block">skipped</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
