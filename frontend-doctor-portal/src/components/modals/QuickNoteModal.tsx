import React, { useState, useEffect } from 'react';
import { FileEdit, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { DoctorReviewApi } from '../../features/doctor-review/api/doctor-review.api';
import { VisitQueueEntryDTO } from '../../features/doctor-review/types/doctor-review.types';

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVisitId?: string;
  onSuccess?: () => void;
}

export const QuickNoteModal: React.FC<QuickNoteModalProps> = ({
  isOpen,
  onClose,
  defaultVisitId,
  onSuccess,
}) => {
  const [queue, setQueue] = useState<VisitQueueEntryDTO[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>(defaultVisitId || '');
  const [note, setNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setNote('');
      DoctorReviewApi.getQueue()
        .then((data) => {
          setQueue(data);
          if (!selectedVisitId && data.length > 0) {
            setSelectedVisitId(data[0].visitId);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultVisitId) {
      setSelectedVisitId(defaultVisitId);
    }
  }, [defaultVisitId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrorMessage('Please enter a note before saving.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await DoctorReviewApi.createQuickNote({
        visitId: selectedVisitId || undefined,
        note: note.trim(),
      });

      setSuccessMessage('Clinical quick note recorded in patient audit trail.');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to save clinical note.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Clinical Note</h3>
              <p className="text-xs text-slate-500">Record an encounter observation or physician instruction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Patient Case Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Associated Patient / Visit (Optional)
            </label>
            <select
              value={selectedVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="">General OPD / No specific visit</option>
              {queue.map((entry) => (
                <option key={entry.visitId} value={entry.visitId}>
                  {entry.patientTokenOrName || `Visit ${entry.visitId.slice(0, 8)}`} — {entry.department}
                </option>
              ))}
            </select>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Clinical Note
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter patient observations, provisional assessment, or follow-up notes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !note.trim()}
              className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Note...</span>
                </>
              ) : (
                <>
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
