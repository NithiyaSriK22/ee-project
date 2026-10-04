import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
import {
  Stethoscope,
  ShieldCheck,
  Building2,
  Lock,
  HeartPulse,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-between p-4 sm:p-6 antialiased text-slate-100">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight">MediKiosk</span>
              <span className="rounded bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-300 border border-teal-400/30">
                Staff Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">Clinical Decision Support & Intake Validation</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs">
          <Building2 className="w-4 h-4 text-teal-400" />
          <span>General OPD Hospital Node</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3 border border-teal-200">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Physician / Staff Sign In</h1>
            <p className="text-xs text-slate-500 mt-1">
              Authorized clinical personnel credentials required
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
              <Lock className="w-3.5 h-3.5 text-teal-600" />
              <span>Role-governed 256-bit encrypted clinical session</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          <p>
            Need access? Clinical staff accounts are provisioned by Hospital Administration.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-white/10 pt-4 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>MediKiosk SIH26047 — Clinical Safety Architecture</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">Module 2 Identity Active</div>
      </footer>
    </div>
  );
};
