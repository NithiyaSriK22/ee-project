import React from 'react';
import { RedFlagAlert } from '../types/redflags.types';
import { AlertActions } from './AlertActions';
import { MapPin, AlertCircle, ShieldAlert, FileText, History, ArrowRight } from 'lucide-react';

interface AlertDetailPanelProps {
  alert: RedFlagAlert | null;
  onAlertUpdated: (updated: RedFlagAlert) => void;
}

export const AlertDetailPanel: React.FC<AlertDetailPanelProps> = ({ alert, onAlertUpdated }) => {
  if (!alert) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
        <ShieldAlert className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">No Alert Selected</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Select any alert from the triage queue on the left to inspect triggering facts, evidence provenance, and take action.
        </p>
      </div>
    );
  }

  const isImmediate = alert.severityTier === 'IMMEDIATE' || alert.severityTier === 'MANUAL';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6 flex flex-col h-full overflow-y-auto">
      {/* Alert Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-black px-3 py-1 rounded-full border ${
                isImmediate
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {alert.severityTier} TIER
            </span>
            <span className="text-xs font-bold text-slate-400">Trigger: {alert.triggerType}</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-sky-600 flex-shrink-0" />
            <span>{alert.kioskLocation}</span>
          </h2>
          <p className="text-xs font-mono text-slate-400">Visit Ref: {alert.visitId}</p>
        </div>

        <div className="text-right text-xs text-slate-500 font-mono">
          <div>Raised: {new Date(alert.raisedAt).toLocaleTimeString()}</div>
          {alert.ruleCode && (
            <div className="mt-1 font-bold text-slate-700">
              Rule: {alert.ruleCode} (v{alert.ruleVersion || 1})
            </div>
          )}
        </div>
      </div>

      {/* Recommended Staff Action Box */}
      <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-1">
        <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wider">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>Recommended Triage Action</span>
        </div>
        <p className="text-sm font-bold text-amber-950">
          {alert.recommendedStaffAction || 'Assess patient directly at the kiosk and review symptoms.'}
        </p>
      </div>

      {/* Clinical Description */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pattern Description</h4>
        <p className="text-sm font-medium text-slate-800">
          {alert.ruleDescription || 'Clinical triage rule pattern matched patient responses.'}
        </p>
      </div>

      {/* Triggering Facts & Evidence Citations */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          <span>Evidence References ({alert.evidences.length})</span>
        </h4>

        {alert.evidences.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {alert.evidences.map((ev) => (
              <div key={ev.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span className="font-mono text-sky-700">{ev.factKey}</span>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">{ev.sourceType}</span>
                </div>
                <div className="text-slate-600">
                  Value snippet: <strong className="text-slate-900">{ev.factValueSnippet || 'Present'}</strong>
                </div>
                <div className="text-[10px] font-mono text-slate-400">Ref ID: {ev.sourceId}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No individual evidence items attached (Manual Help Trigger).</p>
        )}
      </div>

      {/* Audit Timeline */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History className="w-4 h-4" />
          <span>Alert Lifecycle Timeline</span>
        </h4>

        <div className="space-y-2">
          {alert.events.map((evt) => (
            <div key={evt.id} className="flex items-center gap-2 text-xs text-slate-600">
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="font-bold text-slate-800">{evt.eventType}</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
              {evt.actorId && (
                <span className="text-slate-500 text-[11px]">(by {evt.actorId})</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <AlertActions alert={alert} onAlertUpdated={onAlertUpdated} />
      </div>
    </div>
  );
};
