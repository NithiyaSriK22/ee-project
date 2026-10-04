import React from 'react';
import { QuestionOption } from '../../types/interview.types';
import { CheckCircle2, Circle } from 'lucide-react';

interface ChoiceInputProps {
  options: Array<string | QuestionOption>;
  value: any;
  onChange: (val: any) => void;
  isMulti?: boolean;
}

export const ChoiceInput: React.FC<ChoiceInputProps> = ({
  options = [],
  value,
  onChange,
  isMulti = false,
}) => {
  const normalizedOptions: QuestionOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt;
  });

  const selectedValues: string[] = isMulti
    ? Array.isArray(value)
      ? value
      : value
      ? [String(value)]
      : []
    : typeof value === 'object'
    ? [value?.value || '']
    : value
    ? [String(value)]
    : [];

  const handleToggle = (optVal: string) => {
    if (isMulti) {
      if (selectedValues.includes(optVal)) {
        onChange(selectedValues.filter((v) => v !== optVal));
      } else {
        onChange([...selectedValues, optVal]);
      }
    } else {
      onChange(optVal);
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
            className={`w-full p-5 rounded-2xl border-2 text-left flex items-center justify-between gap-4 transition-all active:scale-[0.99] shadow-sm ${
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
    </div>
  );
};
