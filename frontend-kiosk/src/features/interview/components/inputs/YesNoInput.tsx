import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '../../../language/useLanguage';

interface YesNoInputProps {
  value: any;
  onChange: (val: any) => void;
  withDetail?: boolean;
}

export const YesNoInput: React.FC<YesNoInputProps> = ({
  value,
  onChange,
  withDetail = true,
}) => {
  const { currentLanguage } = useLanguage();
  const selectedVal = typeof value === 'object' && value !== null ? value?.value : value;
  const initialDetail = typeof value === 'object' && value !== null ? value?.detail || '' : '';
  const [detail, setDetail] = useState(initialDetail);

  // Synchronize internal detail state whenever incoming value changes (e.g. next question or answer cleared)
  useEffect(() => {
    const nextDetail = typeof value === 'object' && value !== null ? value?.detail || '' : '';
    setDetail(nextDetail);
  }, [value]);

  const handleSelect = (choice: 'YES' | 'NO') => {
    if (withDetail) {
      onChange({ value: choice, detail });
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
          className={`py-8 px-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg cursor-pointer ${
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
          <span className="text-2xl font-bold tracking-wide">
            {currentLanguage === 'ta' ? 'ஆம் (YES)' : currentLanguage === 'hi' ? 'हाँ (YES)' : 'YES'}
          </span>
        </button>

        {/* NO button */}
        <button
          type="button"
          onClick={() => handleSelect('NO')}
          className={`py-8 px-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg cursor-pointer ${
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
          <span className="text-2xl font-bold tracking-wide">
            {currentLanguage === 'ta' ? 'இல்லை (NO)' : currentLanguage === 'hi' ? 'नहीं (NO)' : 'NO'}
          </span>
        </button>
      </div>

      {/* Optional brief details input once an option is selected in withDetail mode */}
      {withDetail && (selectedVal === 'YES' || selectedVal === 'NO') && (
        <div className="w-full max-w-xl animate-fadeIn">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {currentLanguage === 'ta'
              ? 'கூடுதல் விவரங்களை உள்ளிடவும் (விருப்பப்பட்டால்):'
              : 'Please provide brief details (optional):'}
          </label>
          <input
            type="text"
            value={detail}
            onChange={handleDetailChange}
            placeholder={
              currentLanguage === 'ta'
                ? 'எ.கா: மாத்திரை பெயர், வலி ஏற்பட்ட நேரம்'
                : selectedVal === 'YES'
                ? 'e.g. tablet name, when it started, or brief note'
                : 'e.g. stopped recently, or brief note'
            }
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 text-base"
          />
        </div>
      )}
    </div>
  );
};
