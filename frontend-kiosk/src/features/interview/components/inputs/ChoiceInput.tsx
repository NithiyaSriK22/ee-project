import React, { useState, useEffect } from 'react';
import { QuestionOption } from '../../types/interview.types';
import { CheckCircle2, Circle } from 'lucide-react';
import { useLanguage } from '../../../language/useLanguage';

interface ChoiceInputProps {
  options: Array<string | QuestionOption>;
  value: any;
  onChange: (val: any) => void;
  isMulti?: boolean;
  withDetail?: boolean;
}

export const ChoiceInput: React.FC<ChoiceInputProps> = ({
  options = [],
  value,
  onChange,
  isMulti = false,
  withDetail = true,
}) => {
  const { currentLanguage } = useLanguage();
  const normalizedOptions: QuestionOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt;
  });

  const rawVal = typeof value === 'object' && value !== null && !Array.isArray(value) ? value.value : value;
  const initialDetail = typeof value === 'object' && value !== null && !Array.isArray(value) ? value.detail || '' : '';
  const [detail, setDetail] = useState(initialDetail);

  // Synchronize internal detail state whenever incoming value changes (e.g. next question or answer cleared)
  useEffect(() => {
    const nextDetail = typeof value === 'object' && value !== null && !Array.isArray(value) ? value.detail || '' : '';
    setDetail(nextDetail);
  }, [value]);

  const selectedValues: string[] = isMulti
    ? Array.isArray(rawVal)
      ? rawVal
      : rawVal
      ? [String(rawVal)]
      : []
    : rawVal
    ? [String(rawVal)]
    : [];

  const handleToggle = (optVal: string) => {
    if (isMulti) {
      let nextSelected: string[];
      if (selectedValues.includes(optVal)) {
        nextSelected = selectedValues.filter((v) => v !== optVal);
      } else {
        nextSelected = [...selectedValues, optVal];
      }
      if (withDetail && detail) {
        onChange({ value: nextSelected, detail });
      } else {
        onChange(nextSelected);
      }
    } else {
      if (withDetail && detail) {
        onChange({ value: optVal, detail });
      } else {
        onChange(optVal);
      }
    }
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDetail(text);
    if (selectedValues.length > 0) {
      const primary = isMulti ? selectedValues : selectedValues[0];
      onChange({ value: primary, detail: text });
    }
  };

  return (
    <div className="w-full max-w-2xl flex flex-col gap-3">
      {normalizedOptions.map((opt, index) => {
        const isSelected = selectedValues.includes(opt.value);

        return (
          <button
            key={`${opt.value}-${index}`}
            type="button"
            onClick={() => handleToggle(opt.value)}
            className={`w-full p-5 rounded-2xl border-2 text-left flex items-center justify-between gap-4 transition-all active:scale-[0.99] shadow-sm cursor-pointer ${
              isSelected
                ? 'bg-teal-500/20 border-teal-400 text-white ring-2 ring-teal-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-lg font-bold">{opt.label}</span>
              {opt.subPrompt && (
                <span className="text-xs text-slate-400 mt-0.5">{opt.subPrompt}</span>
              )}
            </div>

            <div className="shrink-0">
              {isSelected ? (
                <CheckCircle2 className="w-7 h-7 text-teal-400 fill-teal-400/20" />
              ) : (
                <Circle className="w-7 h-7 text-slate-500" />
              )}
            </div>
          </button>
        );
      })}

      {/* Optional brief details input once a choice is selected */}
      {withDetail && selectedValues.length > 0 && (
        <div className="w-full animate-fadeIn mt-2 pt-2 border-t border-slate-800/80">
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
                ? 'கூடுதல் குறிப்புகள் (விருப்பப்பட்டால்)'
                : 'e.g. additional notes or brief details'
            }
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 text-base"
          />
        </div>
      )}
    </div>
  );
};
