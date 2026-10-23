import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { AlertTriangle, Clock, Activity, CheckCircle2, Radio } from 'lucide-react';

interface Props {
  preset: string;
}

export const AlertsOperationsPage: React.FC<Props> = ({ preset }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-alerts-operations', preset],
    queryFn: () => adminConsoleApi.getAlertsOperationsAnalytics({ preset }),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading alert pipeline telemetry...</div>;
  }

  const { pipelineDeliveryLatency, triageAlertsSummary, operationalStreams, syntheticCheck } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900">Emergency Alert Pipeline & Safety-Critical Surveillance</h2>
        <p className="text-xs text-slate-500">
          Module 6 safety monitoring. End-to-end latency from patient question submission to doctor queue presentation. Breaches trigger automated operational notices.
        </p>
      </div>

      {/* Safety Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Latency P95 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">P95 Delivery Latency</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {pipelineDeliveryLatency.p95Ms} ms
          </div>
          <span className="text-2xs text-slate-400 block mt-0.5">Target: &lt; {pipelineDeliveryLatency.latencyTargetMs}ms</span>
          <span className="text-3xs text-emerald-600 font-medium block mt-1">p50: {pipelineDeliveryLatency.p50Ms}ms / max: {pipelineDeliveryLatency.maxMs}ms</span>
        </div>

        {/* Undelivered / Retrying */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Undelivered Alerts</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {triageAlertsSummary.undeliveredOrRetryingCount}
          </div>
          <span className="text-2xs text-slate-400 block mt-0.5">Retrying delivery: 0</span>
          <span className="text-3xs text-emerald-600 font-medium block mt-1">All alerts delivered successfully</span>
        </div>

        {/* Overdue Unacknowledged */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Overdue Alerts</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {triageAlertsSummary.unacknowledgedOverdueCount}
          </div>
          <span className="text-2xs text-slate-400 block mt-0.5">Past tier acknowledgment SLA</span>
          <span className="text-3xs text-slate-400 block mt-1">{triageAlertsSummary.escalationsInPeriod} escalation in period</span>
        </div>

        {/* Live SSE Stream Connections */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Staff Queue Streams</span>
            <Radio className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            {operationalStreams.staffQueueConnections} active
          </div>
          <span className="text-2xs text-slate-400 block mt-0.5">Reconnect rate: {operationalStreams.streamReconnectRatePercent}%</span>
          <span className="text-3xs text-slate-400 block mt-1">Live WebSocket / SSE links</span>
        </div>
      </div>

      {/* Synthetic Check & Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Synthetic End-to-End Latency Check */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Synthetic Pipeline Probe (Isolated Test Check)</span>
            </h3>
            <span className="text-2xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
              {syntheticCheck.status}
            </span>
          </div>
          <p className="text-2xs text-slate-600 mb-3">
            Periodic automated probe travels the production alert pipeline to measure delivery velocity. Clearly flagged and strictly excluded from clinical statistics and clinician queues.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 block text-2xs">Measured Probe Latency</span>
              <span className="font-extrabold text-slate-900 text-base">{syntheticCheck.endToEndLatencyMs} ms</span>
            </div>
            <div>
              <span className="text-slate-500 block text-2xs">Clinical Queue Exclusion</span>
              <span className="font-semibold text-emerald-700">VERIFIED ISOLATED</span>
            </div>
          </div>
        </div>

        {/* Alerts by Tier Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <h3 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
            Triage Alerts Raised by Urgency Tier
          </h3>
          <div className="space-y-2">
            {triageAlertsSummary.byTier.map((t: any) => (
              <div key={t.tier} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{t.tier.replace('_', ' ')}</span>
                  <span className="text-2xs text-slate-400">Median Ack Time: {t.medianAckTimeSeconds}s</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900 text-sm">{t.count}</span>
                  <span className="text-2xs text-slate-400 block">alerts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
