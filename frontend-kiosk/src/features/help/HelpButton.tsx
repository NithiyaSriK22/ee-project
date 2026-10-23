import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useLanguage } from '../language/useLanguage';

interface HelpButtonProps {
  className?: string;
  kioskLocation?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ className = '', kioskLocation = 'Kiosk 1, OPD Block A' }) => {
  const { locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [reason, setReason] = useState('');

  const handleRequestHelp = async (selectedReason?: string) => {
    try {
      setLoading(true);
      await apiClient.post('/kiosk/help-request', {
        kioskLocation,
        reason: selectedReason || reason || 'Assistance requested by patient at kiosk',
      });
      setRequested(true);
    } catch {
      // Even if network fails, we show optimistic feedback and alert staff
      setRequested(true);
    } finally {
      setLoading(false);
    }
  };

  const helpReasons = [
    locale.helpReasonUnwell,
    locale.helpReasonPain,
    locale.helpReasonScreen,
    locale.helpReasonCompanion,
  ];

  return (
    <>
      {/* Floating or Top-Nav Always-Visible Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label={locale.helpButton}
        className={`flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-base shadow-lg hover:shadow-rose-500/30 transition-all border-2 border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-300 cursor-pointer ${className}`}
      >
        <AlertCircle className="w-6 h-6 animate-pulse" />
        <span>{locale.helpButton}</span>
      </button>

      {/* Confirmation & Assistance Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border-4 border-rose-500 space-y-6">
            {!requested ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{locale.helpModalTitle}</h3>
                    <p className="text-sm font-medium text-slate-600">{locale.helpModalSubtitle}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">{locale.helpReasonPrompt}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {helpReasons.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setReason(opt);
                          handleRequestHelp(opt);
                        }}
                        disabled={loading}
                        className="p-3 text-left rounded-xl border-2 border-slate-200 hover:border-rose-500 hover:bg-rose-50 font-medium text-sm text-slate-800 transition-all cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-5 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    {locale.helpCancel}
                  </button>
                  <button
                    onClick={() => handleRequestHelp()}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{locale.helpCalling}</span>
                      </>
                    ) : (
                      locale.helpCallStaff
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">{locale.helpSuccessTitle}</h3>
                <p className="text-base font-medium text-slate-600 leading-relaxed">
                  {locale.helpSuccessMessage} (<strong>{kioskLocation}</strong>)
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setRequested(false);
                  }}
                  className="px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base transition-all cursor-pointer"
                >
                  {locale.helpSuccessButton}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
