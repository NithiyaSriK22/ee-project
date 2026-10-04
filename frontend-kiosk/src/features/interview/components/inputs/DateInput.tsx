import React from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  value: any;
  onChange: (val: any) => void;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange }) => {
  const dateStr = typeof value === 'object' ? value?.value || '' : value || '';

  const handleQuickOffset = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const formatted = d.toISOString().split('T')[0];
    onChange(formatted);
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      <div className="w-full p-6 bg-slate-900 border-2 border-slate-700 rounded-3xl flex flex-col items-center gap-4 shadow-inner">
        <Calendar className="w-8 h-8 text-teal-400" />

        <input
          type="date"
          value={dateStr}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-5 py-4 bg-slate-800 border border-slate-600 rounded-2xl text-white font-bold text-lg text-center focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
        />
      </div>

      {/* Quick Date buttons */}
      <div className="w-full">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2 text-center">
          Quick Selection:
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickOffset(0)}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 active:scale-95"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleQuickOffset(1)}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 active:scale-95"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => handleQuickOffset(7)}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 active:scale-95"
          >
            1 Week Ago
          </button>
        </div>
      </div>
    </div>
  );
};
