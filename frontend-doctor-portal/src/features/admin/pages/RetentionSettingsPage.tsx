import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { Sliders, Lock, AlertTriangle } from 'lucide-react';

export const RetentionSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [holdScope, setHoldScope] = useState('ALL');
  const [holdReason, setHoldReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-retention'],
    queryFn: () => adminConsoleApi.getRetentionSettings(),
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: number }) =>
      adminConsoleApi.updateRetentionSetting({ settingKey: key, settingValue: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-retention'] });
    },
  });

  const holdMutation = useMutation({
    mutationFn: () => adminConsoleApi.placeLegalHold({ scope: holdScope, reason: holdReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-retention'] });
      setIsHoldModalOpen(false);
      setHoldReason('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to place legal hold.');
    },
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading retention policy configurations...</div>;
  }

  const { settings, legalHolds, governanceNotice } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <span>Data Retention Policies & Legal Holds</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure automated pruning thresholds and suspend deletion using formal legal holds.
          </p>
        </div>

        <button
          onClick={() => setIsHoldModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Place Legal Hold</span>
        </button>
      </div>

      {/* Hospital Governance & Legal Council Warning Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-3 shadow-2xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-0.5">Formal Governance Advisory</span>
          <p className="text-amber-800 leading-relaxed">{governanceNotice}</p>
        </div>
      </div>

      {/* Active Legal Holds */}
      {legalHolds.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-2xs p-4">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-xs mb-3 border-b border-rose-100 pb-2">
            <Lock className="w-4 h-4" />
            <span>Active Legal Holds (Retention Pruning Suspended)</span>
          </div>
          <div className="space-y-2">
            {legalHolds.map((hold: any) => (
              <div key={hold.id} className="p-3 bg-rose-50/50 rounded-lg border border-rose-100 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900">Scope: {hold.scope}</span>
                  <p className="text-slate-600 text-3xs italic mt-0.5">{hold.reason}</p>
                </div>
                <div className="text-right">
                  <span className="text-3xs text-slate-500 block">Placed by: {hold.placedBy}</span>
                  <span className="text-3xs text-slate-400">{new Date(hold.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retention Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settings.map((setting: any) => (
          <div key={setting.settingKey} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="font-mono text-2xs text-indigo-700 block font-semibold">{setting.settingKey}</span>
              <p className="text-2xs text-slate-500 mt-1">{setting.description || 'Configured retention period'}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-900">{setting.settingValue}</span>
                <span className="text-2xs text-slate-400 ml-1">days</span>
              </div>
              <button
                onClick={() => {
                  const val = prompt(`Enter new retention days for ${setting.settingKey}:`, String(setting.settingValue));
                  if (val && !isNaN(Number(val))) {
                    updateSettingMutation.mutate({ key: setting.settingKey, value: Number(val) });
                  }
                }}
                className="text-2xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Change Policy
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Legal Hold Modal */}
      {isHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Impose Legal Hold</h3>
            <p className="text-xs text-slate-600">
              Suspends all automated retention deletion across the specified data store scope. This action is permanently audited.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Hold Scope</label>
                <select
                  value={holdScope}
                  onChange={(e) => setHoldScope(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">ALL (Entire Platform Data)</option>
                  <option value="AUDIT_LOGS">AUDIT_LOGS (Audit Trail Only)</option>
                  <option value="ANALYTICS_EVENTS">ANALYTICS_EVENTS (Telemetry Only)</option>
                  <option value="VISITS">VISITS (Patient Intake Profiles)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Formal Legal Justification</label>
                <textarea
                  rows={3}
                  placeholder="State litigation matter, court order, or external compliance inquiry reference..."
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsHoldModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => holdMutation.mutate()}
                disabled={holdMutation.isPending || holdReason.trim().length < 10}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {holdMutation.isPending ? 'Placing Hold...' : 'Confirm Legal Hold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
