import React, { useState } from 'react';
import { RedFlagAlert } from '../types/redflags.types';
import { redflagsApi } from '../api/redflags.api';
import { Check, UserCheck, CheckCircle2, ArrowUpRight, XCircle, Loader2 } from 'lucide-react';

interface AlertActionsProps {
  alert: RedFlagAlert;
  onAlertUpdated: (updated: RedFlagAlert) => void;
}

export const AlertActions: React.FC<AlertActionsProps> = ({ alert, onAlertUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);

  // Form states
  const [resolutionType, setResolutionType] = useState('CLINICAL_ASSESSMENT_COMPLETED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [dismissalReason, setDismissalReason] = useState('FALSE_POSITIVE_PATIENT_CORRECTION');
  const [dismissalNote, setDismissalNote] = useState('');

  const handleAcknowledge = async () => {
    try {
      setLoading(true);
      const res = await redflagsApi.acknowledgeAlert(alert.id);
      onAlertUpdated(res);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    try {
      setLoading(true);
      const res = await redflagsApi.startAssessment(alert.id);
      onAlertUpdated(res);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    try {
      setLoading(true);
      const res = await redflagsApi.escalateAlert(alert.id, 'Duty doctor escalation requested');
      onAlertUpdated(res);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await redflagsApi.resolveAlert(alert.id, {
        resolutionType,
        resolutionNote,
      });
      setShowResolveModal(false);
      onAlertUpdated(res);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await redflagsApi.dismissAlert(alert.id, {
        dismissalReason,
        note: dismissalNote,
      });
      setShowDismissModal(false);
      onAlertUpdated(res);
    } finally {
      setLoading(false);
    }
  };

  const isTerminal = alert.status === 'RESOLVED' || alert.status === 'DISMISSED';

  if (isTerminal) {
    return (
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600 font-medium">
        Alert is closed ({alert.status}). No further actions permitted.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {alert.status === 'RAISED' && (
          <button
            onClick={handleAcknowledge}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Acknowledge Alert</span>
          </button>
        )}

        {(alert.status === 'ACKNOWLEDGED' || alert.status === 'ESCALATED') && (
          <button
            onClick={handleStartAssessment}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            <span>Start Assessment</span>
          </button>
        )}

        {alert.status !== 'RAISED' && (
          <button
            onClick={() => setShowResolveModal(true)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Resolve Alert</span>
          </button>
        )}

        <button
          onClick={handleEscalate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm transition-all"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Escalate to Duty Doctor</span>
        </button>

        {alert.status !== 'RAISED' && (
          <button
            onClick={() => setShowDismissModal(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-all ml-auto"
          >
            <XCircle className="w-4 h-4 text-slate-500" />
            <span>Dismiss (False Positive)</span>
          </button>
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleResolveSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="text-xl font-black text-slate-900">Resolve Triage Alert</h3>
            <p className="text-xs text-slate-500">Record clinical resolution details before closing.</p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Resolution Category</label>
              <select
                value={resolutionType}
                onChange={(e) => setResolutionType(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
              >
                <option value="CLINICAL_ASSESSMENT_COMPLETED">Clinical Assessment Completed at Kiosk</option>
                <option value="PATIENT_ESCALATED_TO_ED">Patient Transferred to Emergency Dept (ED)</option>
                <option value="ASSISTED_WITH_KIOSK">Assisted Patient with Kiosk Intake</option>
                <option value="TRANSFERRED_TO_DOCTOR">Prioritized to OPD Doctor Desk</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Clinical Resolution Note</label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
                placeholder="Describe actions taken (e.g. checked vitals, patient stable, redirected to acute bay)..."
                className="w-full px-3 py-2 border rounded-xl text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow"
              >
                {loading ? 'Saving...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dismiss Modal */}
      {showDismissModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleDismissSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="text-xl font-black text-slate-900">Dismiss as False Positive</h3>
            <p className="text-xs text-slate-500">
              Audit requirement: False positive dismissal requires selecting a controlled reason.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Dismissal Reason (Controlled)</label>
              <select
                value={dismissalReason}
                onChange={(e) => setDismissalReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
              >
                <option value="FALSE_POSITIVE_PATIENT_CORRECTION">Patient Corrected Mistyped Answer</option>
                <option value="EQUIPMENT_MISREAD">Document OCR / Sensor Equipment Misread</option>
                <option value="CLINICALLY_IRRELEVANT_SYMPTOM">Chronic Stable Symptom (Clinically Irrelevant)</option>
                <option value="DUPLICATE_INCIDENT">Duplicate Call / Attendant Already Present</option>
                <option value="ASSISTED_PATIENT_STABLE">Patient Assisted and Confirmed Stable</option>
                <option value="OTHER_EXPLAINED">Other Explained (Requires detailed note)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Staff Dismissal Explanation</label>
              <textarea
                value={dismissalNote}
                onChange={(e) => setDismissalNote(e.target.value)}
                rows={3}
                placeholder="Document why this trigger does not represent an acute emergency..."
                className="w-full px-3 py-2 border rounded-xl text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDismissModal(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow"
              >
                {loading ? 'Saving...' : 'Confirm Dismissal'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
