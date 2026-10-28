import React, { useState, useEffect } from 'react';
import { Delete, Plus, Minus } from 'lucide-react';

interface NumericInputProps {
  value: any;
  onChange: (val: any) => void;
  unit?: string;
  min?: number;
  max?: number;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  unit,
  min = 0,
  max = 200,
}) => {
  const currentVal = value !== undefined && value !== null && value !== '' ? String(typeof value === 'object' && value !== null ? value.value : value) : '';
  const [displayVal, setDisplayVal] = useState(currentVal);

  useEffect(() => {
    const nextVal = value !== undefined && value !== null && value !== '' ? String(typeof value === 'object' && value !== null ? value.value : value) : '';
    setDisplayVal(nextVal);
  }, [value]);

  const handleKeypadPress = (digit: string) => {
    let nextStr = displayVal + digit;
    // Allow single decimal point
    if (digit === '.' && displayVal.includes('.')) return;
    setDisplayVal(nextStr);
    const parsed = parseFloat(nextStr);
    if (!isNaN(parsed)) {
      onChange(unit ? { value: parsed, unit } : parsed);
    }
  };

  const handleBackspace = () => {
    const nextStr = displayVal.slice(0, -1);
    setDisplayVal(nextStr);
    if (nextStr === '') {
      onChange('');
    } else {
      const parsed = parseFloat(nextStr);
      if (!isNaN(parsed)) {
        onChange(unit ? { value: parsed, unit } : parsed);
      }
    }
  };

  const handleStep = (delta: number) => {
    const currentNum = parseFloat(displayVal) || 0;
    const nextNum = Math.max(min, Math.min(max, currentNum + delta));
    const nextStr = String(nextNum);
    setDisplayVal(nextStr);
    onChange(unit ? { value: nextNum, unit } : nextNum);
  };

  const handleClear = () => {
    setDisplayVal('');
    onChange('');
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6">
      {/* Value Display Box */}
      <div className="w-full p-6 bg-slate-900 border-2 border-teal-500/50 rounded-3xl text-center shadow-inner flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center active:scale-95 transition-all"
        >
          <Minus className="w-6 h-6" />
        </button>

        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-black text-white tracking-wider">
            {displayVal || '—'}
          </span>
          {unit && <span className="text-sm font-semibold text-teal-400">{unit}</span>}
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Touch Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleKeypadPress(digit)}
            className="py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-2xl border border-slate-700 active:scale-95 shadow-md transition-all"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleBackspace}
          className="py-4 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 flex items-center justify-center active:scale-95 shadow-md transition-all"
          aria-label="Backspace"
        >
          <Delete className="w-7 h-7" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleClear}
        className="text-xs text-slate-400 hover:text-slate-200 underline"
      >
        Clear number
      </button>
    </div>
  );
};
