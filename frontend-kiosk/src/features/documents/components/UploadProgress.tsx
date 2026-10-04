import React from 'react';
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface UploadProgressProps {
  stage: 'UPLOADING' | 'OCR_EXTRACTING' | 'VALIDATING' | 'COMPLETE';
  fileName?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ stage, fileName }) => {
  const getStageInfo = () => {
    switch (stage) {
      case 'UPLOADING':
        return {
          title: 'Uploading Prescription...',
          subtitle: 'Securing image data in encrypted hospital object storage',
          pct: 35,
        };
      case 'OCR_EXTRACTING':
        return {
          title: 'Extracting Medical Text...',
          subtitle: 'Reading medication names, dosages, and notes from document',
          pct: 70,
        };
      case 'VALIDATING':
        return {
          title: 'Verifying with Drug Formulary...',
          subtitle: 'Running deterministic validation gate against reference database',
          pct: 90,
        };
      case 'COMPLETE':
      default:
        return {
          title: 'Document Digitized Successfully',
          subtitle: 'All extracted clinical fields have been structured for doctor review',
          pct: 100,
        };
    }
  };

  const info = getStageInfo();

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-slate-900 border border-teal-500/30 rounded-3xl text-center shadow-2xl space-y-6 animate-fadeIn">
      <div className="w-20 h-20 rounded-full bg-teal-500/10 border-2 border-teal-500/40 flex items-center justify-center mx-auto shadow-inner">
        {stage === 'COMPLETE' ? (
          <CheckCircle2 className="w-10 h-10 text-teal-400" />
        ) : (
          <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-extrabold text-white">{info.title}</h3>
        <p className="text-xs text-slate-300 max-w-xs mx-auto">{info.subtitle}</p>
        {fileName && <p className="text-[11px] text-slate-500 font-mono pt-1">{fileName}</p>}
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
        <div
          className="bg-gradient-to-r from-teal-500 to-sky-400 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${info.pct}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-teal-300">
        <ShieldCheck className="w-4 h-4 text-teal-400" />
        <span>Deterministic Clinical Verification Gate Active</span>
      </div>
    </div>
  );
};
