import React from 'react';
import { AlertTriangle, RotateCcw, ArrowRight, UserCheck } from 'lucide-react';

interface DocumentScanErrorStateProps {
  errorMessage?: string;
  onRetry: () => void;
  onSkipOrStaffHelp: () => void;
}

export const DocumentScanErrorState: React.FC<DocumentScanErrorStateProps> = ({
  errorMessage,
  onRetry,
  onSkipOrStaffHelp,
}) => {
  return (
    <div className="w-full max-w-lg mx-auto p-8 bg-slate-900 border border-amber-500/40 rounded-3xl text-center shadow-2xl space-y-6 animate-fadeIn">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400">
        <AlertTriangle className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">Document Scan Notice</h3>
        <p className="text-sm text-slate-300">
          {errorMessage ||
            "We couldn't read this document clearly. This often happens with faint ink, folded edges, or low camera lighting."}
        </p>
      </div>

      <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs text-slate-300 text-left space-y-2">
        <p className="font-semibold text-white">Helpful Tips for Rescanning:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li>Flatten any folded corners of the prescription.</li>
          <li>Make sure the paper is centered inside the dashed frame.</li>
          <li>Avoid shadows or glare on the text.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Scanning Again</span>
        </button>

        <button
          type="button"
          onClick={onSkipOrStaffHelp}
          className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <UserCheck className="w-4 h-4 text-sky-400" />
          <span>Hand Physical Paper to Staff</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
