import React, { useState } from 'react';
import { ConfirmedRecordDTO } from '../types/doctor-review.types';
import { DoctorReviewApi } from '../api/doctor-review.api';
import { FileEdit, ShieldAlert, Check, RefreshCw } from 'lucide-react';

interface AmendDialogProps {
  record: ConfirmedRecordDTO;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRecord: ConfirmedRecordDTO) => void;
}

export const AmendDialog: React.FC<AmendDialogProps> = ({
  record,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAmend = async () => {
    if (!reason.trim()) {
      setError('An amendment reason is strictly required by clinical governance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const newRecord = await DoctorReviewApi.amendRecord(record.id, {
        amendmentReason: reason.trim(),
        updatedStatements: record.statements.map((s) => ({
          id: s.id,
          section: s.section,
          text: s.text,
          origin: s.origin,
          order: s.order,
        })),
      });
      onSuccess(newRecord);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create confirmed record amendment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-200 space-y-4">
        <div className="flex items-center gap-3 text-red-700">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <FileEdit className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Amend Confirmed Clinical Record (v{record.version})
            </h3>
            <p className="text-xs text-slate-500">
              Confirmed records are immutable. Amending creates version v{record.version + 1} and preserves full audit history.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
          <div>
            Visit ID: <code className="font-mono">{record.visitId}</code>
          </div>
          <div>
            Original Confirmation: {new Date(record.confirmedAt).toLocaleString()}
          </div>
          <div>
            Attestation Version: <code className="font-mono">{record.attestationVersion}</code>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Clinical Reason for Amendment (Required):
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Patient clarified dosage during consultation, added follow-up blood pressure reading..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAmend}
            disabled={isSubmitting || !reason.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Amending...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Create Version v{record.version + 1}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
