import React, { useState } from 'react';
import { Search, Hash, Volume2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../language/useLanguage';

interface ReturningPatientStepProps {
  initialRegNumber?: string;
  onSubmit: (regNumber: string) => void;
  onBack: () => void;
  isLoading?: boolean;
  onSpeakPrompt?: (text: string) => void;
}

export const ReturningPatientStep: React.FC<ReturningPatientStepProps> = ({
  initialRegNumber = '',
  onSubmit,
  onBack,
  isLoading = false,
  onSpeakPrompt,
}) => {
  const { locale } = useLanguage();
  const [regNumber, setRegNumber] = useState(initialRegNumber);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber.trim()) {
      setError(locale.returningErrorEmpty);
      return;
    }
    setError(null);
    onSubmit(regNumber.trim());
  };

  const appendKey = (char: string) => {
    setRegNumber((prev) => prev + char);
  };

  const deleteKey = () => {
    setRegNumber((prev) => prev.slice(0, -1));
  };

  const clearKey = () => {
    setRegNumber('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-800 text-xs font-semibold mb-2 border border-indigo-200">
          <Hash className="w-4 h-4" />
          <span>{locale.returningBadge}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {locale.returningHeading}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {locale.returningSubtitle}
        </p>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={() => onSpeakPrompt(locale.returningSubtitle)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{locale.returningAudioButton}</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-5">
          <div>
            <label htmlFor="reg-num" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {locale.returningInputLabel}
            </label>
            <div className="relative">
              <input
                id="reg-num"
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                placeholder={locale.returningInputPlaceholder}
                className="w-full text-center text-2xl sm:text-3xl font-mono font-bold tracking-wider py-4 px-6 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 placeholder:text-slate-300 focus:outline-hidden focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600 uppercase"
              />
            </div>
          </div>

          {/* On-Screen Touch Keypad */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 text-center">
              {locale.returningKeypadTitle}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-sm mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => appendKey(num)}
                  className="py-3 sm:py-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 rounded-xl text-lg sm:text-xl font-bold transition-colors cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => appendKey('MK-')}
                className="py-3 sm:py-4 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs sm:text-sm font-bold border border-teal-200 cursor-pointer"
              >
                MK-
              </button>
              <button
                type="button"
                onClick={() => appendKey('0')}
                className="py-3 sm:py-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 rounded-xl text-lg sm:text-xl font-bold transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={deleteKey}
                className="py-3 sm:py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs sm:text-sm font-bold border border-rose-200 cursor-pointer"
              >
                {locale.returningKeypadDelete}
              </button>
            </div>

            <div className="flex justify-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => appendKey('-')}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                {locale.returningKeypadHyphen}
              </button>
              <button
                type="button"
                onClick={clearKey}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                {locale.returningKeypadClear}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-base transition-colors cursor-pointer"
          >
            {locale.returningBack}
          </button>
          <button
            type="submit"
            disabled={isLoading || !regNumber.trim()}
            className="flex-2 py-4 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-800/20 disabled:opacity-50 cursor-pointer"
          >
            <Search className="w-5 h-5" />
            <span>{isLoading ? locale.returningVerifying : locale.returningSubmit}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
