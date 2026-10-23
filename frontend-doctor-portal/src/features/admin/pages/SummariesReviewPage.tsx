import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { Cpu, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface Props {
  preset: string;
}

export const SummariesReviewPage: React.FC<Props> = ({ preset }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-summaries-review', preset],
    queryFn: () => adminConsoleApi.getSummariesReviewAnalytics({ preset }),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading summary & review analytics...</div>;
  }

  const { synthesisModes, groundingValidation, latency, reviewFunnel, systemQualitySignals } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900">Clinical Summarization & Review Quality Analytics</h2>
        <p className="text-xs text-slate-500">
          Telemetry for AI summarization (Module 5) and Doctor Review (Module 7). All metrics serve as system prompt and grounding quality signals. Doctor ranking or individual performance tracking is strictly forbidden.
        </p>
      </div>

      {/* Primary Quality Signals Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* System Edit Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Summary Edit Rate</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {systemQualitySignals.confirmedRecordEditRatePercent}%
          </div>
          <span className="text-2xs text-slate-400 block mt-0.5">Confirmed records with doctor edits</span>
          <span className="text-3xs text-amber-600 font-medium block mt-1">Prompt quality signal, not doctor score</span>
        </div>

        {/* Fallback Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Template Fallback Rate</span>
            <Cpu className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {synthesisModes.fallbackRatePercent}%
          </div>
          <span className="text-2xs text-slate-400 block mt-0.5">{synthesisModes.templateFallbackCount} fallback vs {synthesisModes.llmCount} LLM</span>
          <span className="text-3xs text-slate-400 block mt-1">Deterministic fail-safe mode</span>
        </div>

        {/* Grounding Validation Failure Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Fact-Check Failure Rate</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {groundingValidation.failureRatePercent}%
          </div>
          <span className="text-2xs text-slate-400 block mt-0.5">Rejected by deterministic fact-checker</span>
          <span className="text-3xs text-emerald-600 font-medium block mt-1">{groundingValidation.retrySuccessRatePercent}% retry recovery</span>
        </div>

        {/* Summary Ready Before Review */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ready Before Review</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {latency.summaryReadyBeforeReviewPercent}%
          </div>
          <span className="text-2xs text-slate-400 block mt-0.5">Median synthesis: {latency.medianMs}ms</span>
          <span className="text-3xs text-slate-400 block mt-1">P95: {latency.p95Ms}ms</span>
        </div>
      </div>

      {/* Review Funnel & Rejection Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctor Review Lifecycle Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <h3 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
            Doctor Review Lifecycle Funnel
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg text-xs">
              <span className="font-medium text-slate-700">1. Reviews Opened / Claimed</span>
              <span className="font-bold text-slate-900">{reviewFunnel.opened}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-emerald-50 rounded-lg text-xs">
              <span className="font-medium text-emerald-800">2. Records Finalized & Confirmed</span>
              <span className="font-bold text-emerald-800">{reviewFunnel.confirmed}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-rose-50 rounded-lg text-xs">
              <span className="font-medium text-rose-800">3. Reviews Rejected to Bedside Manual Intake</span>
              <span className="font-bold text-rose-800">{reviewFunnel.rejected}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-amber-50 rounded-lg text-xs">
              <span className="font-medium text-amber-800">4. Records Amended Post-Confirmation</span>
              <span className="font-bold text-amber-800">{reviewFunnel.amendedPostConfirmation}</span>
            </div>
          </div>
        </div>

        {/* Rejection Reasons */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <h3 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
            Controlled Rejection Reasons (System Quality)
          </h3>
          <div className="space-y-2">
            {systemQualitySignals.rejectionReasonsDistribution.map((r: any) => (
              <div key={r.reasonCode} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 text-xs">
                <span className="font-mono text-2xs text-slate-700">{r.reasonCode}</span>
                <span className="font-bold text-slate-900">{r.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-2xs text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Visits with Must-Resolve Items: <strong>{systemQualitySignals.shareOfVisitsWithMustResolveItemsPercent}%</strong>. Unresolved high-tier red flags or unreadable documents prevent one-click confirmation.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
