import React, { useState } from 'react';
import { ShieldAlert, RotateCcw, Info, CheckCircle2 } from 'lucide-react';

interface DemoBannerProps {
  onOpenBuiltVsMocked: () => void;
  onResetComplete?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onOpenBuiltVsMocked, onResetComplete }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    setResetSuccess(false);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (res.ok) {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 2500);
        if (onResetComplete) onResetComplete();
      }
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <aside aria-label="Demo status" className="bg-[#b91c1c] text-white text-xs px-4 py-2 border-b border-[#991b1b] shadow-sm select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium tracking-wide">
          <ShieldAlert className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
          <span className="font-bold uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            HACKATHON DEMO SLICE
          </span>
          <span className="hidden sm:inline opacity-90">•</span>
          <span className="opacity-95">Synthetic Data Only — Not a Diagnostic Device</span>
          <span className="hidden md:inline opacity-90">•</span>
          <span className="hidden md:inline opacity-95">Doctor Confirmation Gate Server-Enforced</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBuiltVsMocked}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors font-medium border border-white/20 active:scale-95"
            title="Inspect built features vs mocked roadmap"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Built vs Mocked</span>
          </button>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-[#991b1b] hover:bg-[#fef2f2] transition-colors font-semibold shadow-xs disabled:opacity-50 active:scale-95"
            title="Wipe database and restore 3 synthetic seed scenarios"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting...' : resetSuccess ? 'Reset Complete!' : 'Reset Demo'}</span>
            {resetSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
