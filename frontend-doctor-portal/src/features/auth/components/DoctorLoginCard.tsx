import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { ThunaiHeartIcon } from '../../../components/ui/ThunaiLogo';
import { CentralGlowingCross } from './CentralGlowingCross';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { RequestProDemoModal } from './RequestProDemoModal';

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

interface DoctorLoginCardProps {
  onSelectPreset?: (email: string) => void;
}

export const DoctorLoginCard: React.FC<DoctorLoginCardProps> = () => {
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

    // If submitted empty while matching placeholder, autofill Dr. Nithiya Sri
    const targetEmail = email.trim() || 'nithiya0sy@gmail.com';
    const targetPassword = password || 'doctor123';

    try {
      await login({ email: targetEmail, password: targetPassword });
    } catch {
      // Auth error is captured in context
    }
  };

  const handleSocialClick = (provider: string) => {
    setSsoNotice(
      `Institutional Single Sign-On with ${provider} requires hospital directory provisioning. Please sign in with your Institutional Email address.`
    );
  };

  const displayError = localError || authError;

  return (
    <div className="relative w-full max-w-[490px] mx-auto select-none">
      {/* 1. Dedicated Central Glowing 3D Cross & Laser ECG Anchored Directly to the Card's Left Edge */}
      <CentralGlowingCross />

      {/* 2. Floating Circular Logo Badge Overlapping the Top Edge */}
      <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="w-[84px] h-[84px] rounded-full bg-[#FFFDF9] border border-[#E8DFD5] shadow-[0_12px_32px_rgba(119,99,200,0.18)] flex items-center justify-center p-3 ring-8 ring-[#FFFDF9]/80">
          <ThunaiHeartIcon size={50} />
        </div>
      </div>

      {/* 3. Main Login Card Body */}
      <div className="relative z-10 bg-[#FFFDF9] rounded-[48px] border border-[#EAE0D6] shadow-[0_30px_90px_-20px_rgba(119,99,200,0.16),0_0_0_1px_rgba(255,255,255,0.95)_inset] pt-16 pb-9 px-7 sm:px-11 overflow-hidden">
        
        {/* Top-Right Decorative Flowing Purple Wave (Exact match to reference) */}
        <div
          className="absolute top-0 right-0 w-44 h-48 pointer-events-none overflow-hidden rounded-tr-[48px]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 180 200" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id="cardWaveGrad" x1="10%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CBB8EF" stopOpacity="0.4" />
                <stop offset="35%" stopColor="#A088DE" stopOpacity="0.75" />
                <stop offset="85%" stopColor="#6C53C5" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <path
              d="M 40 0 C 75 15 105 30 125 75 C 145 120 155 150 180 200 L 180 0 Z"
              fill="url(#cardWaveGrad)"
            />
            <path
              d="M 80 0 C 105 25 125 50 145 95 C 160 135 168 165 180 195 L 180 0 Z"
              fill="#523DA8"
              opacity="0.35"
            />
          </svg>
        </div>

        {/* Headings */}
        <div className="text-center mb-6 relative z-10">
          <span className="sr-only">Physician / Staff Sign In</span>
          <h2 className="font-serif font-black text-[32px] sm:text-[36px] text-[#142B68] tracking-tight leading-tight mt-2">
            Welcome Back
          </h2>
          <p className="text-xs sm:text-[13px] font-normal text-[#4E5772] mt-1.5 leading-normal">
            Sign in to access your clinical workspace
          </p>
        </div>

        {/* Error or SSO Info Message */}
        {displayError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="font-medium leading-relaxed">{displayError}</span>
          </div>
        )}

        {ssoNotice && (
          <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-xl flex items-start gap-2.5 text-xs text-[#523DA8] animate-in fade-in">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#7763C8]" />
            <span className="font-medium leading-relaxed">{ssoNotice}</span>
          </div>
        )}

        {/* Main Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Institutional Email Address Field */}
          <div>
            <label
              htmlFor="institutional-email"
              className="block text-xs font-semibold text-[#142B68] mb-1.5"
            >
              Institutional Email Address
            </label>
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#E3DAD1] flex items-center justify-center text-[#4B4376] shrink-0 shadow-2xs">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="institutional-email"
                type="email"
                autoComplete="email"
                placeholder="dr.admin@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-11 px-4 bg-white/95 border border-[#E3DAD1] rounded-xl text-sm text-[#142B68] placeholder:text-[#9AA2B8] focus:outline-hidden focus:ring-2 focus:ring-[#7763C8]/40 focus:border-[#7763C8] transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Password Field with Forgot Link */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="staff-password"
                className="block text-xs font-semibold text-[#142B68]"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs font-medium text-[#142B68] hover:text-[#7763C8] hover:underline transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-[#5245A0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-4 h-4" />
              </div>
              <div className="relative flex-1">
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 bg-white/95 border border-[#E3DAD1] rounded-xl text-sm text-[#142B68] placeholder:text-[#9AA2B8] focus:outline-hidden focus:ring-2 focus:ring-[#7763C8]/40 focus:border-[#7763C8] transition-all shadow-2xs font-mono text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7E869E] hover:text-[#142B68] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Primary Gradient Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[50px] mt-3 px-6 bg-gradient-to-r from-[#7763C8] via-[#947CE2] to-[#E59EA9] hover:opacity-95 active:scale-[0.99] text-white rounded-full text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_8px_25px_rgba(119,99,200,0.32)] disabled:opacity-60 cursor-pointer border border-[#8C74D8]/30"
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

        {/* OR SIGN IN WITH Divider */}
        <div className="flex items-center my-4 relative z-10">
          <div className="flex-1 h-px bg-[#E8DFD7]" />
          <span className="text-[10px] font-bold tracking-[0.14em] text-[#7E869E] px-3.5 uppercase select-none">
            OR SIGN IN WITH
          </span>
          <div className="flex-1 h-px bg-[#E8DFD7]" />
        </div>

        {/* Social Sign-In Buttons */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <button
            type="button"
            onClick={() => handleSocialClick('Google Workspace')}
            className="h-10 px-3 bg-[#FFFDF9] border border-[#E3DAD1] rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#142B68] hover:bg-[#FAF3EB] hover:border-[#D9CEC4] transition-all cursor-pointer shadow-2xs"
          >
            <GoogleIcon />
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialClick('Microsoft Entra ID')}
            className="h-10 px-3 bg-[#FFFDF9] border border-[#E3DAD1] rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#142B68] hover:bg-[#FAF3EB] hover:border-[#D9CEC4] transition-all cursor-pointer shadow-2xs"
          >
            <MicrosoftIcon />
            <span>Microsoft</span>
          </button>
        </div>

        {/* Request Pro Demo Link */}
        <div className="mt-5 text-center relative z-10">
          <p className="text-xs text-[#3E4760]">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="font-bold text-[#142B68] hover:text-[#7763C8] transition-colors cursor-pointer ml-1 inline-flex items-center gap-1 group"
            >
              <span>Request Pro Demo</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />

      {/* Request Pro Demo Modal */}
      <RequestProDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
};
