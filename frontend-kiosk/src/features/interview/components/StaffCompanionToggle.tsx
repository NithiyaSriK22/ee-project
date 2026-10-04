import React from 'react';
import { AnsweredVia, AnsweredViaType } from '../types/interview.types';
import { User, Users, ShieldCheck } from 'lucide-react';

interface StaffCompanionToggleProps {
  currentMode: AnsweredViaType;
  onChange: (mode: AnsweredViaType) => void;
}

export const StaffCompanionToggle: React.FC<StaffCompanionToggleProps> = ({
  currentMode,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-sm">
      <span className="text-xs font-medium text-slate-400 pl-2 pr-1 hidden sm:inline">
        Answering Mode:
      </span>

      <button
        type="button"
        onClick={() => onChange(AnsweredVia.TOUCH)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
          currentMode === AnsweredVia.TOUCH || currentMode === AnsweredVia.VOICE
            ? 'bg-teal-500 text-slate-950 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <User className="w-3.5 h-3.5" />
        <span>Patient Direct</span>
      </button>

      <button
        type="button"
        onClick={() => onChange(AnsweredVia.COMPANION_ASSISTED)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
          currentMode === AnsweredVia.COMPANION_ASSISTED
            ? 'bg-sky-500 text-slate-950 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        <span>Companion Assisted</span>
      </button>

      <button
        type="button"
        onClick={() => onChange(AnsweredVia.STAFF_ASSISTED)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
          currentMode === AnsweredVia.STAFF_ASSISTED
            ? 'bg-purple-500 text-slate-950 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Staff Assisted</span>
      </button>
    </div>
  );
};
