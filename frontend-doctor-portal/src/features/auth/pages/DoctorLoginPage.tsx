import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
import { HospitalCross } from '../../../components/ui/HospitalCross';
import {
  ShieldCheck,
  Building2,
  Lock,
  Activity,
} from 'lucide-react';

export const DoctorLoginPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/40 flex flex-col justify-between p-4 sm:p-6 antialiased text-slate-800 relative selection:bg-red-600 selection:text-white">
      {/* Decorative Hospital Red Ambient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-100/30 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Top Clinical Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-3">
          {/* Hospital Red Cross Emblem */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/25 border-2 border-white ring-2 ring-red-100">
            <HospitalCross className="h-6 w-6" fill="white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">MediKiosk</span>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                Hospital Staff Portal
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500">Government Hospital OPD Pre-Consultation Network</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-red-800 bg-white border border-red-200 px-3.5 py-2 rounded-xl shadow-xs">
          <Building2 className="w-4 h-4 text-red-600" />
          <span>General OPD Hospital Node</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8 relative z-10">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border-2 border-red-100 p-8 sm:p-9 relative overflow-hidden">
          {/* Top Medical Red Highlight Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />

          <div className="text-center mb-6 pt-1">
            {/* Iconic Hospital Symbol: Red Cross inside circular badge */}
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3.5 border-2 border-red-200 shadow-sm ring-4 ring-red-50/60">
              <HospitalCross className="w-9 h-9" fill="#DC2626" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Physician / Staff Sign In</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Authorized clinical personnel credentials required
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
              <Lock className="w-3.5 h-3.5 text-red-600" />
              <span>Role-governed 256-bit encrypted clinical session</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          <p>
            Emergency & OPD Clinical Access • Government Hospital Network
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-200 pt-4 gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-red-600" />
          <span className="font-medium text-slate-700">MediKiosk SIH26047 — Clinical Safety Architecture</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <Activity className="w-3.5 h-3.5 text-red-600" />
          <span>Hospital Theme: Red & White Active</span>
        </div>
      </footer>
    </div>
  );
};
