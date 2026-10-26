import React, { useState, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { DoctorReviewApi } from '../../features/doctor-review/api/doctor-review.api';
import { VisitQueueEntryDTO } from '../../features/doctor-review/types/doctor-review.types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultVisitId?: string;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultVisitId,
}) => {
  const [queue, setQueue] = useState<VisitQueueEntryDTO[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>(defaultVisitId || '');
  const [documentType, setDocumentType] = useState<string>('PRESCRIPTION');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setFile(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 15 * 1024 * 1024) {
        setErrorMessage('File exceeds maximum size limit of 15MB.');
        return;
      }
      setFile(selected);
      setErrorMessage(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitId) {
      setErrorMessage('Please select a patient visit session.');
      return;
    }
    if (!file) {
      setErrorMessage('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      await apiClient.post(`/doctor/visits/${selectedVisitId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMessage('Document uploaded and queued for clinical OCR & analysis successfully.');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
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
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Medical Document</h3>
              <p className="text-xs text-slate-500">Attach clinical prescription or diagnostic report</p>
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
        <form onSubmit={handleUpload} className="p-6 space-y-4">
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

          {/* Patient / Visit Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Patient Case
            </label>
            <select
              value={selectedVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              {queue.length === 0 ? (
                <option value="">No active cases in queue</option>
              ) : (
                queue.map((entry) => (
                  <option key={entry.visitId} value={entry.visitId}>
                    {entry.patientTokenOrName || `Visit ${entry.visitId.slice(0, 8)}`} — {entry.department}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Document Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Document Category
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="PRESCRIPTION">Prescription (Past / External)</option>
              <option value="LAB_REPORT">Diagnostic / Lab Report</option>
              <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
              <option value="CLINICAL_NOTE">Doctor / Clinical Note</option>
            </select>
          </div>

          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              File Attachment
            </label>
            <label className="border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-teal-50/20">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileText className="w-8 h-8 text-slate-400 mb-2" />
              {file ? (
                <div className="text-center">
                  <p className="text-xs font-bold text-teal-900">{file.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-700">Click to browse or drag file here</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, or PDF up to 15MB</p>
                </div>
              )}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file || !selectedVisitId}
              className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Process</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
