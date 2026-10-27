import React, { useState } from 'react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { CenterPulse } from './CenterPulse';
import { ForgotPasswordModal } from '../../features/auth/components/ForgotPasswordModal';
import { RequestProDemoModal } from '../../features/auth/components/RequestProDemoModal';

const GoogleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const MicrosoftIcon: React.FC = () => (
  <svg viewBox="0 0 21 21" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

export const LoginCard: React.FC = () => {
  const { login, isLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [ssoNotice, setSsoNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSsoNotice(null);

    const targetEmail = email.trim();
    const targetPassword = password;

    if (!targetEmail || !targetPassword) {
      setLocalError('Please enter both your institutional email address and password.');
      return;
    }

    try {
      await login({ email: targetEmail, password: targetPassword });
    } catch {
      // captured in auth state
    }
  };

  const handleSocialClick = (provider: string) => {
    setSsoNotice(
      `Institutional Single Sign-On with ${provider} requires hospital directory provisioning. Please sign in with your Institutional Email address.`
    );
  };

  const displayError = localError || authError;

  return (
    <div className="relative w-full max-w-[485px] mx-auto select-none">
      {/* Center Pulse Line & Cross connecting to Left Border */}
      <CenterPulse />

      {/* Floating Logo Badge: White Circle (~80px) with Soft Peach Ring & Glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center p-3"
          style={{
            boxShadow: '0 0 0 6px rgba(253, 235, 221, 0.9), 0 8px 24px rgba(245, 186, 120, 0.35)',
          }}
        >
          <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M32 54 C32 54 10 39 10 24 C10 15 17 9 25 9 C29 9 32 11 32 11 C32 11 35 9 39 9 C47 9 54 15 54 24 C54 39 32 54 32 54 Z"
              stroke="#1B2A5E"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 28 L23 28 L26 23 L29 36 L33 17 L37 40 L41 26 L44 31 L51 31"
              stroke="#1B2A5E"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Coral Star Accent */}
            <path
              d="M51 6 Q51 12 57 12 Q51 12 51 18 Q51 12 45 12 Q51 12 51 6 Z"
              fill="#E5484D"
            />
          </svg>
        </div>
      </div>

      {/* Main Login Card Body: Opaque Gradient from #FFFFFF to #FFF8F0 */}
      <div className="relative z-10 bg-gradient-to-b from-[#FFFFFF] to-[#FFF8F0] rounded-[48px] border border-peach shadow-card pt-16 pb-9 px-7 sm:px-11 overflow-hidden">
        
        {/* Top-Right Decorative Flowing Wave */}
        <div
          className="absolute top-0 right-0 w-48 h-52 pointer-events-none overflow-hidden rounded-tr-[48px]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 200 220" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id="waveLayer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EDE6FA" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#A68BE0" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#7B5CC4" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <path
              d="M 60 0 C 95 35 120 55 145 105 C 165 145 172 185 200 220 L 200 0 Z"
              fill="url(#waveLayer)"
            />
          </svg>
        </div>

        {/* Headings: font-display, 700, ~44px, navy */}
        <div className="text-center mb-6 relative z-10">
          <span className="sr-only">Physician / Staff Sign In</span>
          <h2 className="font-display font-bold text-[38px] sm:text-[44px] text-navy tracking-tight leading-tight mt-2">
            Welcome Back
          </h2>
          <p className="text-xs sm:text-[14px] font-normal text-navysoft font-body mt-1.5 leading-normal">
            Sign in to access your clinical workspace
          </p>
        </div>

        {/* Errors & Notices */}
        {displayError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="font-medium leading-relaxed font-body">{displayError}</span>
          </div>
        )}

        {ssoNotice && (
          <div className="mb-4 p-3 bg-lavender border border-lavender2 rounded-2xl flex items-start gap-2.5 text-xs text-brand animate-in fade-in">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand" />
            <span className="font-medium leading-relaxed font-body">{ssoNotice}</span>
          </div>
        )}

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Email */}
          <div>
            <label
              htmlFor="institutional-email"
              className="block text-xs font-semibold text-navy font-body mb-1.5"
            >
              Institutional Email Address
            </label>
            <div className="flex items-center gap-2.5">
              {/* Round ~44px Lavender Bubble with Indigo Icon */}
              <div className="w-11 h-11 rounded-full bg-[#EDE6FA] flex items-center justify-center text-[#4B3FA0] shrink-0 shadow-2xs">
                <Mail className="w-5 h-5 text-[#4B3FA0]" strokeWidth={2.2} />
              </div>
              <input
                id="institutional-email"
                type="email"
                autoComplete="email"
                placeholder="dr.admin@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-11 px-4 bg-white border border-peach rounded-2xl text-sm text-navy font-body placeholder:text-navysoft/60 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="staff-password"
                className="block text-xs font-semibold text-navy font-body"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs font-medium text-navy hover:text-brand hover:underline transition-colors cursor-pointer font-body"
              >
                Forgot password?
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              {/* Round ~44px Filled Indigo Bubble with White Lock Icon */}
              <div className="w-11 h-11 rounded-full bg-[#4B3FA0] flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-5 h-5 text-white stroke-white fill-none" strokeWidth={2.2} />
              </div>
              <div className="relative flex-1">
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 bg-white border border-peach rounded-2xl text-sm text-navy placeholder:text-navysoft/60 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all shadow-2xs font-mono text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-navysoft hover:text-navy transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Sign In Button: Gradient from #8B6FE0 to #F2B8A8, Purple Glow Shadow, Non-faded */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[52px] mt-3 px-6 bg-gradient-to-r from-[#8B6FE0] to-[#F2B8A8] text-white rounded-full text-[15px] font-semibold tracking-wide flex items-center justify-center gap-2.5 shadow-[0_10px_28px_-4px_rgba(139,111,224,0.48)] hover:opacity-95 active:scale-[0.99] transition-all duration-200 disabled:opacity-85 disabled:cursor-wait cursor-pointer font-body opacity-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Signing into Workspace...</span>
              </>
            ) : (
              <>
                <span className="font-semibold">Sign in to Clinical Workspace</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* OR SIGN IN WITH */}
        <div className="flex items-center my-4 relative z-10">
          <div className="flex-1 h-px bg-peach" />
          <span className="text-[10px] font-bold tracking-[0.14em] text-navysoft px-3.5 uppercase select-none font-body">
            OR SIGN IN WITH
          </span>
          <div className="flex-1 h-px bg-peach" />
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <button
            type="button"
            onClick={() => handleSocialClick('Google Workspace')}
            className="h-11 px-4 bg-white border border-peach rounded-full flex items-center justify-center gap-2 text-xs font-semibold text-navy hover:bg-cream transition-all cursor-pointer font-body shadow-2xs"
          >
            <GoogleIcon />
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialClick('Microsoft Entra ID')}
            className="h-11 px-4 bg-white border border-peach rounded-full flex items-center justify-center gap-2 text-xs font-semibold text-navy hover:bg-cream transition-all cursor-pointer font-body shadow-2xs"
          >
            <MicrosoftIcon />
            <span>Microsoft</span>
          </button>
        </div>

        {/* Request Pro Demo Link */}
        <div className="mt-5 text-center relative z-10">
          <p className="text-xs text-navysoft font-body">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="font-bold text-navy hover:text-brand transition-colors cursor-pointer ml-1 inline-flex items-center gap-1 group"
            >
              <span>Request Pro Demo</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </p>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />

      <RequestProDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
};
