import React from 'react';
import { UserCheck, ShieldAlert } from 'lucide-react';

interface CalmAlertMessageProps {
  messageType?: 'IMMEDIATE' | 'STAFF_CHECK' | null;
  onContinue?: () => void;
  onPause?: () => void;
}

export const CalmAlertMessage: React.FC<CalmAlertMessageProps> = ({
  messageType,
  onContinue,
  onPause,
}) => {
  if (!messageType) return null;

  const isImmediate = messageType === 'IMMEDIATE';

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 max-w-3xl mx-auto px-4 animate-slide-up">
      <div className={`rounded-3xl p-6 shadow-2xl border-2 flex flex-col md:flex-row items-center justify-between gap-5 ${
        isImmediate
          ? 'bg-amber-50 border-amber-300 text-amber-950'
          : 'bg-sky-50 border-sky-300 text-sky-950'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isImmediate ? 'bg-amber-200 text-amber-800' : 'bg-sky-200 text-sky-800'
          }`}>
            {isImmediate ? <ShieldAlert className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
          </div>
          <div>
            <h4 className="text-xl font-bold">
              {isImmediate
                ? 'A hospital staff member is coming to assist you.'
                : 'A staff member will verify a few intake details with you.'}
            </h4>
            <p className="text-sm font-medium opacity-90 mt-1">
              {isImmediate
                ? 'Thank you for answering. Please remain seated comfortably at this kiosk. Staff will attend to you shortly.'
                : 'Our counter staff will review your information shortly to ensure complete records.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
          {onPause && (
            <button
              onClick={onPause}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm hover:bg-white/80 transition-all"
            >
              Pause / இடைநிறுத்து
            </button>
          )}
          {onContinue && (
            <button
              onClick={onContinue}
              className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
                isImmediate ? 'bg-amber-700 hover:bg-amber-800' : 'bg-sky-700 hover:bg-sky-800'
              }`}
            >
              Continue / தொடரவும்
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
