import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { HospitalCross } from '../../../components/ui/HospitalCross';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const LoginForm: React.FC = () => {
  const { login, isLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('nithiya0sy@gmail.com');
  const [password, setPassword] = useState('doctor123');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      await login({ email, password });
    } catch (err: any) {
      // Auth error is captured in context
    }
  };

  const handleQuickFill = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('doctor123');
    setLocalError(null);
  };

  const displayError = localError || authError;

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {displayError && (
          <div className="p-3.5 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="font-semibold leading-relaxed">{displayError}</span>
          </div>
        )}

        {/* Email input */}
        <div>
          <label htmlFor="staff-email" className="block text-xs font-bold text-slate-800 mb-1.5">
            Institutional Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="staff-email"
              type="email"
              required
              autoComplete="email"
              placeholder="dr.nithiya@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Password input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="staff-password" className="block text-xs font-bold text-slate-800">
              Password
            </label>
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="staff-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Account Preset Chips */}
        <div className="pt-1">
          <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Quick Clinical Preset:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill('nithiya0sy@gmail.com')}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                email === 'nithiya0sy@gmail.com'
                  ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Dr. Nithiya Sri (Doctor)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('dr.ananya@hospital.org')}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                email === 'dr.ananya@hospital.org'
                  ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Dr. Ananya
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@medikiosk.hospital')}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                email === 'admin@medikiosk.hospital'
                  ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-3 py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-red-600/30 disabled:opacity-60 cursor-pointer border border-red-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating with Clinical Authority...</span>
            </>
          ) : (
            <>
              <HospitalCross className="w-4 h-4" fill="white" />
              <span>Sign In to Clinical Workspace</span>
            </>
          )}
        </button>
      </form>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
};
