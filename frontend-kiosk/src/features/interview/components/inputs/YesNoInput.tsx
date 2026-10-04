import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface YesNoInputProps {
  value: any;
  onChange: (val: any) => void;
  withDetail?: boolean;
}

export const YesNoInput: React.FC<YesNoInputProps> = ({
  value,
  onChange,
  withDetail = false,
}) => {
  const selectedVal = typeof value === 'object' ? value?.value : value;
  const initialDetail = typeof value === 'object' ? value?.detail || '' : '';
  const [detail, setDetail] = useState(initialDetail);

  const handleSelect = (choice: 'YES' | 'NO') => {
    if (withDetail) {
      onChange({ value: choice, detail: choice === 'YES' ? detail : '' });
    } else {
      onChange(choice);
    }
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDetail(text);
    if (selectedVal) {
      onChange({ value: selectedVal, detail: text });
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
        {/* YES button */}
        <button
          type="button"
          onClick={() => handleSelect('YES')}
          className={`py-8 px-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg ${
            selectedVal === 'YES'
              ? 'bg-teal-500/20 border-teal-400 text-white ring-4 ring-teal-500/30'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              selectedVal === 'YES' ? 'bg-teal-500 text-slate-950' : 'bg-slate-700/80 text-teal-400'
            }`}
          >
            <Check className="w-9 h-9 stroke-[3]" />
          </div>
          <span className="text-2xl font-bold tracking-wide">YES</span>
        </button>

        {/* NO button */}
        <button
          type="button"
          onClick={() => handleSelect('NO')}
          className={`py-8 px-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg ${
            selectedVal === 'NO'
              ? 'bg-rose-500/20 border-rose-400 text-white ring-4 ring-rose-500/30'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              selectedVal === 'NO' ? 'bg-rose-500 text-slate-950' : 'bg-slate-700/80 text-rose-400'
            }`}
          >
            <X className="w-9 h-9 stroke-[3]" />
          </div>
          <span className="text-2xl font-bold tracking-wide">NO</span>
        </button>
      </div>

      {/* Optional details input if YES selected in withDetail mode */}
      {withDetail && selectedVal === 'YES' && (
        <div className="w-full max-w-xl animate-fadeIn">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Please provide brief details (optional):
          </label>
          <input
            type="text"
            value={detail}
            onChange={handleDetailChange}
            placeholder="e.g., Since yesterday evening / mild intensity"
            className="w-full px-5 py-4 bg-slate-900 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 text-base"
          />
        </div>
      )}
    </div>
  );
};
