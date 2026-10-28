import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DurationInputProps {
  value: any;
  onChange: (val: any) => void;
}

const timeUnits = [
  { label: 'Hours', value: 'hours' },
  { label: 'Days', value: 'days' },
  { label: 'Weeks', value: 'weeks' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' },
];

const quickPresets = [
  { count: 1, unit: 'days', label: '1 Day' },
  { count: 2, unit: 'days', label: '2 Days' },
  { count: 3, unit: 'days', label: '3 Days' },
  { count: 1, unit: 'weeks', label: '1 Week' },
  { count: 2, unit: 'weeks', label: '2 Weeks' },
  { count: 1, unit: 'months', label: '1 Month' },
];

export const DurationInput: React.FC<DurationInputProps> = ({ value, onChange }) => {
  const initialCount = typeof value === 'object' && value !== null ? value?.count || 1 : 1;
  const initialUnit = typeof value === 'object' && value !== null ? value?.unit || 'days' : 'days';

  const [count, setCount] = useState<number>(initialCount);
  const [unit, setUnit] = useState<string>(initialUnit);

  useEffect(() => {
    const nextCount = typeof value === 'object' && value !== null ? value?.count || 1 : 1;
    const nextUnit = typeof value === 'object' && value !== null ? value?.unit || 'days' : 'days';
    setCount(nextCount);
    setUnit(nextUnit);
  }, [value]);

  const handleUpdate = (newCount: number, newUnit: string) => {
    setCount(newCount);
    setUnit(newUnit);
    onChange({
      value: `${newCount} ${newUnit}`,
      count: newCount,
      unit: newUnit,
    });
  };

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      {/* Quick preset chips */}
      <div className="w-full">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3 text-center">
          Quick Duration Options:
        </span>
        <div className="grid grid-cols-3 gap-3">
          {quickPresets.map((preset) => {
            const isSelected = count === preset.count && unit === preset.unit;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleUpdate(preset.count, preset.unit)}
                className={`py-3 px-4 rounded-2xl border text-sm font-bold transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-teal-500/20 border-teal-400 text-teal-300 ring-2 ring-teal-500/30'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Duration Builder */}
      <div className="w-full p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center gap-4 shadow-inner">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <Clock className="w-4 h-4 text-teal-400" />
          <span>Or customize specific time:</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Number selector */}
          <div className="flex items-center bg-slate-800 rounded-2xl p-1 border border-slate-700">
            {[1, 2, 3, 4, 5, 6, 7, 10, 14, 30].slice(0, 5).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleUpdate(num, unit)}
                className={`w-10 h-10 rounded-xl text-base font-bold transition-all ${
                  count === num ? 'bg-teal-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Unit selector */}
          <div className="flex items-center bg-slate-800 rounded-2xl p-1 border border-slate-700">
            {timeUnits.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => handleUpdate(count, u.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  unit === u.value ? 'bg-sky-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <span className="text-xs text-slate-400">Selected: </span>
          <span className="text-base font-bold text-teal-300">
            {count} {unit}
          </span>
        </div>
      </div>
    </div>
  );
};
