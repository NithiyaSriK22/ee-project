import React, { useState } from 'react';
import { MustResolveItem, PassiveFlag } from '../types/doctor-review.types';
import { CheckCircle2, AlertTriangle, ShieldCheck, Flag, Lock, RefreshCw } from 'lucide-react';

interface ConfirmBarProps {
  unresolvedCount: number;
  mustResolveItems: MustResolveItem[];
  passiveFlags: PassiveFlag[];
  attestationText: string;
  attestationVersion: string;
  isConfirming: boolean;
  onConfirm: (attestationAccepted: boolean) => Promise<void>;
  onRejectDraft?: () => void;
  onRegenerateDraft?: () => void;
}

export const ConfirmBar: React.FC<ConfirmBarProps> = ({
  unresolvedCount,
  mustResolveItems,
  passiveFlags,
  attestationText,
  attestationVersion,
  isConfirming,
  onConfirm,
  onRejectDraft,
  onRegenerateDraft,
}) => {
  const [attestationAccepted, setAttestationAccepted] = useState<boolean>(false);
  const [showOutstandingModal, setShowOutstandingModal] = useState<boolean>(false);

  const unresolvedItems = mustResolveItems.filter((i) => !i.isResolved);
  const canConfirm = unresolvedCount === 0 && attestationAccepted && !isConfirming;

  const handleConfirmClick = async () => {
    if (unresolvedCount > 0) {
      setShowOutstandingModal(true);
      return;
    }
    if (!attestationAccepted) {
      alert('Please check the hospital physician attestation checkbox to confirm.');
      return;
    }
    await onConfirm(true);
  };

  return (
    <>
      {/* Sticky Bottom Bar */}
      <div className="sticky bottom-0 z-30 bg-white border-t-2 border-red-200 px-6 py-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Status & Indicators */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {unresolvedCount > 0 ? (
            <div
              onClick={() => setShowOutstandingModal(true)}
              className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-300 text-xs font-bold cursor-pointer hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
              <span>
                {unresolvedCount} critical item{unresolvedCount !== 1 ? 's' : ''} require your resolution
              </span>
              <span className="underline ml-1">View</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All critical items resolved — ready for physician confirmation</span>
            </div>
          )}

          {/* Passive Flags Counter */}
          {passiveFlags.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <Flag className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {passiveFlags.length} passive flag{passiveFlags.length !== 1 ? 's' : ''} (non-blocking)
              </span>
            </div>
          )}
        </div>

        {/* Center Attestation Checkbox */}
        <div className="flex items-center gap-2 w-full md:max-w-xl">
          <input
            id="doctor-attestation-checkbox"
            type="checkbox"
            checked={attestationAccepted}
            onChange={(e) => setAttestationAccepted(e.target.checked)}
            className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
          />
          <label
            htmlFor="doctor-attestation-checkbox"
            className="text-[11px] text-slate-600 leading-tight select-none cursor-pointer"
          >
            <span className="font-bold text-slate-800">Physician Attestation: </span>
            {attestationText}
            <span className="font-mono text-[10px] text-slate-400 ml-1">[{attestationVersion}]</span>
          </label>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {onRejectDraft && (
            <button
              type="button"
              onClick={onRejectDraft}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            >
              Reject Draft
            </button>
          )}

          {onRegenerateDraft && (
            <button
              type="button"
              onClick={onRegenerateDraft}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Regenerate
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={!canConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
              canConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            {isConfirming ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Confirming Record...
              </>
            ) : unresolvedCount > 0 ? (
              <>
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Confirm Locked ({unresolvedCount} remaining)</span>
              </>
            ) : !attestationAccepted ? (
              <>
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Accept Attestation to Confirm</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm & Sign Clinical Record</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Outstanding Items Modal if doctor attempts to confirm early */}
      {showOutstandingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-3 text-red-700">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Confirmation Blocked</h3>
                <p className="text-xs text-slate-500">
                  The server strictly gates confirmation. {unresolvedItems.length} critical item{unresolvedItems.length !== 1 ? 's' : ''} require explicit physician resolution:
                </p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 py-2">
              {unresolvedItems.map((item) => (
                <div
                  key={item.itemRef}
                  className="p-3 bg-red-50/60 rounded-lg border border-red-200 text-xs text-slate-800"
                >
                  <div className="font-bold text-red-950 flex items-center justify-between">
                    <span>{item.title}</span>
                    <span className="font-mono text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                      {item.itemType}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOutstandingModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Return to Review Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
