import React from 'react';
import { WorkspaceAlertItem } from '../types/doctor-review.types';
import { AlertTriangle, ShieldAlert, CheckCircle, Clock, MapPin, User } from 'lucide-react';

interface AlertBannerProps {
  alerts: WorkspaceAlertItem[];
  alertDisclaimer: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, alertDisclaimer }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-800">No active red-flag triage alerts raised for this visit.</span>
        </div>
        <span className="text-[11px] text-slate-500 italic hidden md:inline">
          {alertDisclaimer}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert) => {
        const isImmediate = alert.severityTier === 'IMMEDIATE';
        const isUrgent = alert.severityTier === 'URGENT';
        const isAcknowledged = !!alert.acknowledgedBy || alert.status === 'ACKNOWLEDGED' || alert.status === 'RESOLVED';

        const borderClass = isImmediate
          ? 'border-rose-300 bg-rose-50/90 text-rose-950'
          : isUrgent
          ? 'border-amber-300 bg-amber-50/90 text-amber-950'
          : 'border-yellow-300 bg-yellow-50/90 text-yellow-950';

        const badgeClass = isImmediate
          ? 'bg-rose-600 text-white'
          : isUrgent
          ? 'bg-amber-600 text-white'
          : 'bg-yellow-600 text-white';

        return (
          <div
            key={alert.id}
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${borderClass}`}
            role="alert"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="mt-0.5 sm:mt-0 flex-shrink-0">
                {isImmediate ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                    {alert.severityTier} RED-FLAG ALERT
                  </span>
                  <span className="text-xs font-semibold">
                    Rule Code: <code className="font-mono">{alert.ruleCode || 'EMERGENCY_SCREEN'}</code>
                  </span>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {alert.kioskLocation}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Raised: {new Date(alert.raisedAt).toLocaleTimeString()}
                  </span>
                  {alert.acknowledgedBy ? (
                    <span className="flex items-center gap-1 text-emerald-800 font-medium">
                      <User className="w-3 h-3 text-emerald-700" />
                      Acknowledged by: {alert.acknowledgedBy} ({new Date(alert.acknowledgedAt || '').toLocaleTimeString()})
                    </span>
                  ) : (
                    <span className="text-rose-700 font-bold underline">
                      Unacknowledged — Doctor or Staff Review Required
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 self-end sm:self-center">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                  isAcknowledged
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                }`}
              >
                Status: {alert.status}
              </span>
            </div>
          </div>
        );
      })}

      <div className="text-[11px] text-slate-500 bg-white/80 p-2 rounded-lg border border-slate-200">
        <span className="font-bold text-slate-700">Safety Notice: </span>
        {alertDisclaimer}
      </div>
    </div>
  );
};
