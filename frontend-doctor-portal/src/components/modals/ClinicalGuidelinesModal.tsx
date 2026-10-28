import React from 'react';
import { Compass, X, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';

interface ClinicalGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClinicalGuidelinesModal: React.FC<ClinicalGuidelinesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Clinical Review Guidelines</h3>
              <p className="text-xs text-slate-500">OPD Physician Case Validation & Confirmation Protocol</p>
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

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-600 leading-relaxed">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Core Mandate: Treating Physician Final Authority</span>
            </div>
            <p>
              AI-generated clinical draft summaries are triage aids only. Every field must be verified by the treating physician against the source patient responses or original scanned documents before confirmation.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>1. Chief Complaint & History Verification</span>
              </div>
              <p className="text-slate-500 pl-6">
                Cross-verify kiosk interview answers with patient statements in consultation. Any discrepancy can be directly edited or supplemented in the Review Workspace.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>2. Prescription & Document OCR Provenance</span>
              </div>
              <p className="text-slate-500 pl-6">
                All medications and clinical parameters extracted via digital text extraction or OCR maintain direct provenance. When extraction confidence is low or text is ambiguous, refer directly to the original document scan.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
