import React from 'react';
import { Check, RotateCcw, Send, Sparkles } from 'lucide-react';
import { DocumentType, DocumentTypeLabels } from '../types/documents.types';

interface CapturePreviewProps {
  imageSrc: string;
  documentType: DocumentType;
  isUploading: boolean;
  onRetake: () => void;
  onConfirmUpload: () => void;
}

export const CapturePreview: React.FC<CapturePreviewProps> = ({
  imageSrc,
  documentType,
  isUploading,
  onRetake,
  onConfirmUpload,
}) => {
  const meta = DocumentTypeLabels[documentType];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6 animate-fadeIn">
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/30">
          Document Photo Captured
        </span>
        <h2 className="text-2xl font-bold text-white">Review Prescription Image</h2>
        <p className="text-xs text-slate-300">
          Make sure doctor notes, medicine names, and dosages are clear and readable.
        </p>
      </div>

      {/* Captured Image Box */}
      <div className="relative w-full aspect-[4/3] bg-slate-900 border-2 border-teal-500/50 rounded-3xl overflow-hidden shadow-2xl">
        <img
          src={imageSrc}
          alt="Captured clinical document"
          className="w-full h-full object-contain bg-slate-950"
        />

        <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-teal-300 font-semibold flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-teal-400" />
          <span>Type: {meta.label}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onRetake}
          disabled={isUploading}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
          <span>Retake Photo</span>
        </button>

        <button
          type="button"
          onClick={onConfirmUpload}
          disabled={isUploading}
          className="w-full sm:w-auto flex-1 max-w-sm py-4 px-8 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-extrabold text-base shadow-xl shadow-teal-500/20 ring-4 ring-teal-400/40 flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer"
        >
          {isUploading ? (
            <span>Digitizing & Validating...</span>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Confirm & Digitize Document</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
        <span>OCR extraction will run and verify all medicines against the active formulary dataset.</span>
      </div>
    </div>
  );
};
