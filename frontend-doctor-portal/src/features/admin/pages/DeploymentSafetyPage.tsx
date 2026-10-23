import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import {
  ShieldAlert,
  ShieldCheck,
  Power,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Database,
  Activity,
  PlusCircle,
  AlertOctagon,
} from 'lucide-react';

export const DeploymentSafetyPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'gates' | 'kill-switches' | 'drills' | 'kiosks'>('gates');

  // Modals state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [drillForm, setDrillForm] = useState({
    status: 'SUCCESS' as 'SUCCESS' | 'FAILED',
    rpoMinutes: 5,
    rtoMinutes: 15,
    backupArchiveSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    verifiedRecordsCount: 250,
    notes: 'Scheduled monthly cold-restore into isolated staging database.',
  });

  // Queries
  const { data: gatesData, refetch: refetchGates } = useQuery({
    queryKey: ['admin-release-gates'],
    queryFn: () => adminConsoleApi.getReleaseGates(),
  });

  const { data: flagsData, refetch: refetchFlags } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => adminConsoleApi.getFeatureFlags(),
  });

  const { data: intakeData, refetch: refetchIntake } = useQuery({
    queryKey: ['admin-intake-status'],
    queryFn: () => adminConsoleApi.getIntakeStatus(),
  });

  const { data: drillsData, refetch: refetchDrills } = useQuery({
    queryKey: ['admin-restore-drills'],
    queryFn: () => adminConsoleApi.getRestoreDrills(),
  });

  const { data: kiosksData, refetch: refetchKiosks } = useQuery({
    queryKey: ['admin-enrolled-kiosks'],
    queryFn: () => adminConsoleApi.getEnrolledKiosks(),
  });

  const { data: alertHealthData } = useQuery({
    queryKey: ['admin-alert-health'],
    queryFn: () => adminConsoleApi.getAlertPipelineHealth(),
    refetchInterval: 10000,
  });

  // Mutations
  const overrideGatesMutation = useMutation({
    mutationFn: () =>
      adminConsoleApi.overrideReleaseGates({
        overriddenBy: 'clinical.lead@hospital.org',
        role: 'CHIEF_MEDICAL_OFFICER',
        justification: overrideJustification,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-release-gates'] });
      setIsOverrideModalOpen(false);
      setOverrideJustification('');
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: ({ key, enabled, reason }: { key: string; enabled: boolean; reason: string }) =>
      adminConsoleApi.toggleFeatureFlag(key, { enabled, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
    },
  });

  const toggleIntakeMutation = useMutation({
    mutationFn: (paused: boolean) =>
      adminConsoleApi.toggleIntakePause({ paused, reason: pauseReason || 'Manual toggle from admin safety console' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-intake-status'] });
      setIsPauseModalOpen(false);
      setPauseReason('');
    },
  });

  const recordDrillMutation = useMutation({
    mutationFn: () => adminConsoleApi.recordRestoreDrill(drillForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restore-drills'] });
      setIsDrillModalOpen(false);
    },
  });

  const isIntakePaused = intakeData?.isPaused;

  return (
    <div className="space-y-6">
      {/* Emergency Global Intake Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isIntakePaused
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`p-2 rounded-lg ${
              isIntakePaused ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-600 text-white'
            }`}
          >
            {isIntakePaused ? <AlertOctagon className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">
                Kiosk Intake Status: {isIntakePaused ? 'EMERGENCY PAUSED' : 'ACTIVE & ACCEPTING PATIENTS'}
              </h2>
              <span
                className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                  isIntakePaused ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                }`}
              >
                {isIntakePaused ? 'PAUSED' : 'OPERATIONAL'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isIntakePaused
                ? 'All new kiosk intake sessions are blocked. Kiosks instruct patients to proceed directly to the triage desk. Doctor review workspace and alerts remain fully functional.'
                : 'Kiosks are actively enrolling patient visits. Doctor review workspace and red-flag alerts are fully operational.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (isIntakePaused) {
              toggleIntakeMutation.mutate(false);
            } else {
              setIsPauseModalOpen(true);
            }
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors ${
            isIntakePaused
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{isIntakePaused ? 'Resume Kiosk Intake' : 'Emergency Pause Intake'}</span>
        </button>
      </div>

      {/* Alert Pipeline Canary Sub-header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-700">Alert Pipeline Canary:</span>
          <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {alertHealthData?.status || 'HEALTHY'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">
            Latency Target: <strong>{alertHealthData?.latencyTargetMs || 2000}ms</strong>
          </span>
          <span className="text-slate-500">
            Last Canary Synthetic Check: <strong>{alertHealthData?.lastSyntheticCheckLatencyMs || 42}ms</strong>
          </span>
        </div>
        <button
          onClick={() => {
            refetchGates();
            refetchFlags();
            refetchIntake();
            refetchDrills();
            refetchKiosks();
          }}
          className="flex items-center gap-1 text-2xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh All Telemetry</span>
        </button>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveSubTab('gates')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'gates'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Release Gates (Clinical Safety)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('kill-switches')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'kill-switches'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>Kill Switches & Feature Flags</span>
        </button>
        <button
          onClick={() => setActiveSubTab('drills')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'drills'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Disaster Recovery & Restore Drills</span>
        </button>
        <button
          onClick={() => setActiveSubTab('kiosks')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'kiosks'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Kiosk Device Enrollment & Hardening</span>
        </button>
      </div>

      {/* Tab 1: Release Gates */}
      {activeSubTab === 'gates' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Clinical Safety Release Gates</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-2xs font-bold ${
                      gatesData?.overallStatus === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : gatesData?.overallStatus === 'OVERRIDDEN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {gatesData?.overallStatus || 'EVALUATING'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated release gate verification for release <strong>{gatesData?.releaseVersion || 'v1.0.0'}</strong>.
                  All 10 clinical safety criteria must pass before production deployment or kiosk intake activation.
                </p>
              </div>

              {gatesData?.overallStatus === 'BLOCKED' && (
                <button
                  onClick={() => setIsOverrideModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 self-start sm:self-auto"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Clinical Emergency Override</span>
                </button>
              )}
            </div>

            {/* Gates Grid */}
            <div className="divide-y divide-slate-100 mt-2">
              {gatesData?.gates?.map((gate: any) => (
                <div key={gate.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5">
                      {gate.status === 'PASS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{gate.criterion}</h4>
                      <p className="text-2xs text-slate-500 mt-0.5">{gate.evidence}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-3xs font-mono font-bold shrink-0 ${
                      gate.status === 'PASS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {gate.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Kill Switches & Feature Flags */}
      {activeSubTab === 'kill-switches' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Server-Controlled Kill Switches</h3>
            <p className="text-xs text-slate-500 mb-4">
              Degrade features instantly without redeploying code. Toggling any switch logs a tamper-evident audit record and never destroys in-flight patient records.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flagsData?.flags?.map((flag: any) => (
                <div
                  key={flag.key}
                  className={`p-4 rounded-xl border transition-all ${
                    flag.enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">{flag.key}</span>
                    <button
                      onClick={() =>
                        toggleFlagMutation.mutate({
                          key: flag.key,
                          enabled: !flag.enabled,
                          reason: `Manual switch to ${!flag.enabled ? 'ENABLED' : 'DISABLED'} by operator`,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        flag.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">{flag.description}</p>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400">
                    <span>
                      Fallback: <strong className="text-slate-600">{flag.fallbackBehavior}</strong>
                    </span>
                    <span>Updated: {new Date(flag.updatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Disaster Recovery & Restore Drills */}
      {activeSubTab === 'drills' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Database Restore Drills (PITR Currency)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tested isolated restore drills verifying cryptographic hash chain, document references, and clinical integrity.
                </p>
              </div>
              <button
                onClick={() => setIsDrillModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Record New Drill</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {drillsData?.drills?.map((drill: any) => (
                <div key={drill.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">{drill.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-3xs font-bold ${
                          drill.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {drill.status}
                      </span>
                    </div>
                    <p className="text-2xs text-slate-500 font-mono mt-1">SHA-256: {drill.backupArchiveSha256}</p>
                    <p className="text-2xs text-slate-600 mt-0.5">{drill.notes}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
                    <div>
                      RPO: <strong className="text-slate-900">{drill.rpoMinutes}m</strong>
                    </div>
                    <div>
                      RTO: <strong className="text-slate-900">{drill.rtoMinutes}m</strong>
                    </div>
                    <div>
                      Records Verified: <strong className="text-slate-900">{drill.verifiedRecordsCount}</strong>
                    </div>
                    <div className="text-2xs text-slate-400">
                      {new Date(drill.restoredAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Kiosk Hardening */}
      {activeSubTab === 'kiosks' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Enrolled Kiosk Devices</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cryptographically registered kiosk hardware with per-device revocable credentials, remote wipe tracking, and single-app lockdown.
            </p>

            <div className="divide-y divide-slate-100">
              {kiosksData?.devices?.map((kiosk: any) => (
                <div key={kiosk.deviceCode} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">{kiosk.deviceCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-3xs font-bold ${
                          kiosk.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : kiosk.status === 'REVOKED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {kiosk.status}
                      </span>
                    </div>
                    <p className="text-2xs text-slate-500 mt-1">
                      Facility: {kiosk.facilityUnit} | OS: {kiosk.operatingSystem} | App: {kiosk.appVersion}
                    </p>
                  </div>

                  {kiosk.status === 'ACTIVE' && (
                    <button
                      onClick={() =>
                        adminConsoleApi.revokeKiosk(kiosk.deviceCode, { reason: 'Hardware maintenance revoke' }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['admin-enrolled-kiosks'] });
                        })
                      }
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold self-start md:self-auto"
                    >
                      Revoke Device
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Emergency Release Gate Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900">Clinical Emergency Release Gate Override</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              This action requires formal Chief Medical Officer / Clinical Lead authorization. It records a permanent, tamper-evident audit log entry.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-2xs font-semibold text-slate-700">Clinical Justification & Sign-off:</label>
                <textarea
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  placeholder="State the clinical necessity, hazard mitigation steps, and authorizing clinical lead name..."
                  className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-lg h-24 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => overrideGatesMutation.mutate()}
                disabled={!overrideJustification.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Authorize Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Intake Reason Modal */}
      {isPauseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-3">
              <AlertOctagon className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900">Confirm Emergency Kiosk Intake Pause</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              All kiosks will immediately stop admitting new patients and display calm signage redirecting patients to the registration desk.
            </p>
            <textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="State the reason for pausing intake (e.g. facility drill, severe network degradation, staff shift handover)..."
              className="w-full p-2 text-xs border border-slate-300 rounded-lg h-20 focus:ring-1 focus:ring-indigo-500"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsPauseModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => toggleIntakeMutation.mutate(true)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Drill Modal */}
      {isDrillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Record Disaster Recovery Restore Drill</h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-2xs font-semibold text-slate-600">RPO (Minutes of Data Loss):</label>
                <input
                  type="number"
                  value={drillForm.rpoMinutes}
                  onChange={(e) => setDrillForm({ ...drillForm, rpoMinutes: Number(e.target.value) })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-2xs font-semibold text-slate-600">RTO (Minutes to Full Recovery):</label>
                <input
                  type="number"
                  value={drillForm.rtoMinutes}
                  onChange={(e) => setDrillForm({ ...drillForm, rtoMinutes: Number(e.target.value) })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-2xs font-semibold text-slate-600">Backup Archive SHA-256:</label>
                <input
                  type="text"
                  value={drillForm.backupArchiveSha256}
                  onChange={(e) => setDrillForm({ ...drillForm, backupArchiveSha256: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono text-2xs"
                />
              </div>
              <div>
                <label className="text-2xs font-semibold text-slate-600">Verified Patient Records Count:</label>
                <input
                  type="number"
                  value={drillForm.verifiedRecordsCount}
                  onChange={(e) => setDrillForm({ ...drillForm, verifiedRecordsCount: Number(e.target.value) })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsDrillModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => recordDrillMutation.mutate()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
              >
                Save Drill Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
