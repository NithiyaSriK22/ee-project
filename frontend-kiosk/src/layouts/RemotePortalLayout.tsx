import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Stethoscope, Smartphone } from 'lucide-react';
import { LanguageSelector } from '../features/language/LanguageSelector';
import { useKioskSession } from '../features/registration/hooks/useKioskSession';

export const RemotePortalLayout: React.FC = () => {
  const navigate = useNavigate();
  const { isSessionActive, endSession } = useKioskSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Mobile Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="w-9 h-9 rounded-xl bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center shadow-xs transition-colors"
              title="Return to Kiosk Terminal"
            >
              <Stethoscope className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  THUNAI
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                  <Smartphone className="w-2.5 h-2.5 text-teal-700" />
                  MOBILE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Remote Patient Portal</p>
            </div>
          </div>

          {/* Right Header Strip: Language & Active Session indicator */}
          <div className="flex items-center gap-2">
            <LanguageSelector />
            {isSessionActive && (
              <button
                type="button"
                onClick={async () => {
                  await endSession();
                  navigate('/portal');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded border border-rose-200 hover:bg-rose-50 transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body (Max width 2xl, perfectly sized for mobile phones and tablets) */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        <Outlet />
      </main>

      {/* Mobile Security Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-teal-800 font-medium mx-auto sm:mx-0">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Encrypted Hospital Intake Portal</span>
          </div>
          <p className="text-[11px] text-slate-400 mx-auto sm:mx-0">
            THUNAI OPD Pre-Consultation System
          </p>
        </div>
      </footer>
    </div>
  );
};
