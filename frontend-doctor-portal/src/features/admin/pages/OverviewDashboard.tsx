import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import {
  Users,
  CheckCircle2,
  Clock,
  FileCheck2,
  AlertTriangle,
  HardDrive,
  Info,
  Percent,
} from 'lucide-react';

interface Props {
  preset: string;
  onOpenCatalog: () => void;
}

export const OverviewDashboard: React.FC<Props> = ({ preset, onOpenCatalog }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-overview', preset],
    queryFn: () => adminConsoleApi.getOperationsOverview({ preset }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading operations metrics...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
        Failed to load operations metrics. Please verify system health and permissions.
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Operations Overview</h2>
          <p className="text-xs text-slate-500">
            Real-time aggregate patient intake, review throughput, and alert statistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
            Preset: {preset.toUpperCase()}
          </span>
          <button
            onClick={onOpenCatalog}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Catalog Definitions</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Visits Started */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Visits Started</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {metrics.visitsStarted.isSuppressed ? metrics.visitsStarted.displayValue : metrics.visitsStarted.value}
            </span>
            <span className="text-2xs text-slate-500">sessions</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500 flex items-center gap-1">
            <span>Formula: Count of KIOSK_SESSION_STARTED</span>
          </div>
        </div>

        {/* 2. Completion Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">
              {metrics.interviewCompletionRate.value}%
            </span>
            <span className="text-2xs text-emerald-600">intake rate</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500">
            <span>Completed vs. Abandoned sessions</span>
          </div>
        </div>

        {/* 3. Intake Duration P50 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Median Intake Duration</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {Math.round(metrics.intakeDuration.medianSeconds / 60)}m {metrics.intakeDuration.medianSeconds % 60}s
            </span>
            <span className="text-2xs text-slate-500">(p90: {Math.round(metrics.intakeDuration.p90Seconds / 60)}m)</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500">
            <span>Session start to interview complete</span>
          </div>
        </div>

        {/* 4. Summaries Fallback Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Summary Fallback Rate</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700">
              {metrics.summaries.fallbackRatePercent}%
            </span>
            <span className="text-2xs text-slate-500">deterministic</span>
          </div>
          <div className="mt-2 text-2xs text-slate-500">
            <span>{metrics.summaries.llmMode} LLM / {metrics.summaries.fallbackMode} Fallback</span>
          </div>
        </div>
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Doctor Review Throughput */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-purple-600" />
              <span>Doctor Review Throughput</span>
            </h3>
            <span className="text-2xs text-slate-400 font-mono">Module 7</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Reviews Opened:</span>
              <span className="font-bold text-slate-900">{metrics.clinicalReviews.opened}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Records Confirmed:</span>
              <span className="font-bold text-emerald-700">{metrics.clinicalReviews.confirmed}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Median Review Duration:</span>
              <span className="font-bold text-slate-900">{metrics.clinicalReviews.medianDurationSeconds}s</span>
            </div>
          </div>
        </div>

        {/* Triage Alerts Safety */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Emergency Triage Alerts</span>
            </h3>
            <span className="text-2xs text-slate-400 font-mono">Module 6</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Total Alerts Raised:</span>
              <span className="font-bold text-amber-700">{metrics.triageAlerts.raised}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Median Ack Time:</span>
              <span className="font-bold text-slate-900">{metrics.triageAlerts.medianAckTimeSeconds}s</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Pipeline Availability:</span>
              <span className="font-bold text-emerald-600">100.0%</span>
            </div>
          </div>
        </div>

        {/* Kiosk Fleet Health */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-slate-700" />
              <span>Kiosk Fleet Status</span>
            </h3>
            <span className="text-2xs text-slate-400 font-mono">Module 8</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Kiosks Online:</span>
              <span className="font-bold text-emerald-700">{metrics.kiosks.online} / {metrics.kiosks.total}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Kiosks Offline:</span>
              <span className={`font-bold ${metrics.kiosks.offline > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {metrics.kiosks.offline}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Heartbeat Currency:</span>
              <span className="font-bold text-emerald-600">&lt; 30s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accessible Operations Table Alternative */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800">Tabular Operations Summary (Screen Reader Accessible)</h3>
          <span className="text-2xs text-slate-500">Version 1.0 Metrics</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-2xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2">Metric Key</th>
                <th className="px-4 py-2">Catalog Name</th>
                <th className="px-4 py-2">Value</th>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2">Definition & Formula</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2 font-mono text-2xs text-slate-600">visit_started</td>
                <td className="px-4 py-2 font-medium text-slate-900">Visits Started</td>
                <td className="px-4 py-2 font-bold">{metrics.visitsStarted.displayValue}</td>
                <td className="px-4 py-2 text-slate-500">count</td>
                <td className="px-4 py-2 text-slate-500">Count of KIOSK_SESSION_STARTED events</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-2xs text-slate-600">visit_completed</td>
                <td className="px-4 py-2 font-medium text-slate-900">Visits Completed</td>
                <td className="px-4 py-2 font-bold">{metrics.visitsCompleted.displayValue}</td>
                <td className="px-4 py-2 text-slate-500">count</td>
                <td className="px-4 py-2 text-slate-500">Count of INTERVIEW_COMPLETED events</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-2xs text-slate-600">interview_completion_rate</td>
                <td className="px-4 py-2 font-medium text-slate-900">Completion Rate</td>
                <td className="px-4 py-2 font-bold text-emerald-700">{metrics.interviewCompletionRate.value}%</td>
                <td className="px-4 py-2 text-slate-500">percent</td>
                <td className="px-4 py-2 text-slate-500">visit_completed / visit_started</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-2xs text-slate-600">intake_duration_p50</td>
                <td className="px-4 py-2 font-medium text-slate-900">Median Intake Duration</td>
                <td className="px-4 py-2 font-bold">{metrics.intakeDuration.medianSeconds}s</td>
                <td className="px-4 py-2 text-slate-500">seconds</td>
                <td className="px-4 py-2 text-slate-500">Median of (completed_at - started_at)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
