import React, { useState } from 'react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { authApi } from '../../features/auth/api/auth.api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { CenterPulse } from './CenterPulse';
import { ForgotPasswordModal } from '../../features/auth/components/ForgotPasswordModal';

const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Pediatrics',
  'Neurology',
  'Dermatology',
  'Orthopedics',
  'Ophthalmology',
  'ENT',
  'Emergency Medicine',
  'General Surgery',
  'Psychiatry',
  'Pulmonology',
];

export const LoginCard: React.FC = () => {
  const { login, register, isLoading, error: authError } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Registration form state (all fields initially empty)
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regMedRegNo, setRegMedRegNo] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('');
  const [regQualification, setRegQualification] = useState('');
  const [regExperienceYears, setRegExperienceYears] = useState<string>('');
  const [regHospitalName, setRegHospitalName] = useState('');
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const targetEmail = email.trim();
    const targetPassword = password;

    if (!targetEmail || !targetPassword) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    try {
      await login({ email: targetEmail, password: targetPassword });
    } catch {
      // captured in auth state
    }
  };

  const handleSuggestShortEmail = async () => {
    if (!regFullName.trim()) {
      setLocalError('Please enter your full name first to generate a short email address.');
      return;
    }
    try {
      setIsGeneratingEmail(true);
      setLocalError(null);
      const res = await authApi.suggestEmail(regFullName.trim());
      if (res?.email) {
        setRegEmail(res.email);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to generate short email suggestion.');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setRegSuccessMessage(null);

    if (!regFullName.trim()) {
      setLocalError('Please enter your Full Name.');
      return;
    }
    if (!regEmail.trim()) {
      setLocalError('Please enter a valid Email Address.');
      return;
    }
    if (!regPassword) {
      setLocalError('Please enter a secure password (minimum 8 characters).');
      return;
    }
    if (regPassword.length < 8) {
      setLocalError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setLocalError('Passwords do not match. Please verify your password confirmation.');
      return;
    }
    if (!regMedRegNo.trim()) {
      setLocalError('Medical Registration Number is required for doctor verification.');
      return;
    }
    if (!regSpecialization) {
      setLocalError('Please select your specialization.');
      return;
    }

    try {
      await register({
        fullName: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
        medicalRegistrationNumber: regMedRegNo.trim(),
        specialization: regSpecialization,
        qualification: regQualification.trim() || undefined,
        experienceYears: regExperienceYears !== '' ? Number(regExperienceYears) : undefined,
        hospitalName: regHospitalName.trim() || undefined,
      });

      setRegSuccessMessage('Your account has been created successfully. Please sign in to continue.');
      setEmail(regEmail.trim().toLowerCase());
    } catch (err: any) {
      setLocalError(err?.message || 'Registration failed. Please check the entered information.');
    }
  };

  const displayError = localError || authError;

  return (
    <div className="relative w-full max-w-[500px] mx-auto select-none">
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

      {/* Main Card Body: Opaque Gradient from #FFFFFF to #FFF8F0 */}
      <div className="relative z-10 bg-gradient-to-b from-[#FFFFFF] to-[#FFF8F0] rounded-[48px] border border-peach shadow-card pt-16 pb-9 px-7 sm:px-10 overflow-hidden">
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

        {/* Headings */}
        <div className="text-center mb-6 relative z-10">
          <span className="sr-only">Doctor Authentication</span>
          <h2 className="font-display font-bold text-[36px] sm:text-[42px] text-navy tracking-tight leading-tight mt-1">
            {mode === 'login' ? 'Welcome Back' : 'Doctor Sign-Up'}
          </h2>
          <p className="text-xs sm:text-[14px] font-normal text-navysoft font-body mt-1 leading-normal">
            {mode === 'login'
              ? 'Sign in to access your clinical workspace'
              : 'Register your doctor credentials for clinical review access'}
          </p>
        </div>

        {/* Success Alert */}
        {regSuccessMessage && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-2 text-xs text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm">Account Created</span>
            </div>
            <p className="text-emerald-800 leading-relaxed font-body">{regSuccessMessage}</p>
            <button
              type="button"
              onClick={() => {
                setRegSuccessMessage(null);
                setMode('login');
              }}
              className="mt-1 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Sign In to Continue →
            </button>
          </div>
        )}

        {/* Errors */}
        {displayError && !regSuccessMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="font-medium leading-relaxed font-body">{displayError}</span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* LOGIN FORM */}
        {/* ==================================================================== */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
            {/* Email Address */}
            <div>
              <label
                htmlFor="doctor-email"
                className="block text-xs font-semibold text-navy font-body mb-1.5"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center justify-center text-brand pointer-events-none">
                  <Mail className="w-5 h-5 text-brand" strokeWidth={2} />
                </div>
                <input
                  id="doctor-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-white/80 border border-peach rounded-2xl text-sm text-navy font-body placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="doctor-password"
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
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center justify-center text-brand pointer-events-none">
                  <Lock className="w-5 h-5 text-brand" strokeWidth={2} />
                </div>
                <input
                  id="doctor-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-12 pr-11 bg-white/80 border border-peach rounded-2xl text-sm text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all shadow-2xs font-body"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 flex items-center text-navysoft hover:text-navy transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[52px] mt-4 px-6 bg-gradient-to-r from-[#8B6FE0] to-[#F2B8A8] text-white rounded-full text-[15px] font-semibold tracking-wide flex items-center justify-center gap-2.5 shadow-[0_10px_28px_-4px_rgba(139,111,224,0.48)] hover:opacity-95 active:scale-[0.99] transition-all duration-200 disabled:opacity-85 disabled:cursor-wait cursor-pointer font-body"
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

            {/* Sign Up Link */}
            <div className="pt-3 text-center relative z-10">
              <p className="text-xs text-navysoft font-body">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    setRegSuccessMessage(null);
                    setMode('register');
                  }}
                  className="font-bold text-navy hover:text-brand transition-colors cursor-pointer ml-1 inline-flex items-center gap-1 group"
                >
                  <span>Sign Up</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </p>
            </div>
          </form>
        ) : (
          /* ==================================================================== */
          /* DOCTOR REGISTRATION FORM */
          /* ==================================================================== */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 relative z-10">
            {/* 1. Full Name */}
            <div>
              <label
                htmlFor="reg-fullname"
                className="block text-xs font-semibold text-navy font-body mb-1"
              >
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-peach rounded-xl text-sm text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body"
                />
              </div>
            </div>

            {/* 2. Email Address with short email generator button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-navy font-body"
                >
                  Email Address *
                </label>
                <button
                  type="button"
                  onClick={handleSuggestShortEmail}
                  disabled={isGeneratingEmail}
                  className="text-[11px] font-semibold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                  title="Generate short development email"
                >
                  {isGeneratingEmail ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-brand" />
                  )}
                  <span>Generate Short Email</span>
                </button>
              </div>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email address"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-peach rounded-xl text-sm text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body"
              />
            </div>

            {/* 3 & 4. Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-navy font-body mb-1"
                >
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={regShowPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 bg-white border border-peach rounded-xl text-sm text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body"
                  />
                  <button
                    type="button"
                    onClick={() => setRegShowPassword(!regShowPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-navysoft hover:text-navy cursor-pointer"
                    aria-label={regShowPassword ? 'Hide password' : 'Show password'}
                  >
                    {regShowPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-semibold text-navy font-body mb-1"
                >
                  Confirm Password *
                </label>
                <input
                  id="reg-confirm-password"
                  type={regShowPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-peach rounded-xl text-sm text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body"
                />
              </div>
            </div>

            {/* 5. Medical Registration Number */}
            <div>
              <label
                htmlFor="reg-medno"
                className="block text-xs font-semibold text-navy font-body mb-1"
              >
                Medical Registration Number *
              </label>
              <input
                id="reg-medno"
                type="text"
                required
                placeholder="Enter your medical registration number"
                value={regMedRegNo}
                onChange={(e) => setRegMedRegNo(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-peach rounded-xl text-sm text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body uppercase placeholder:normal-case"
              />
            </div>

            {/* 6. Specialization & Qualification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-specialization"
                  className="block text-xs font-semibold text-navy font-body mb-1"
                >
                  Specialization *
                </label>
                <select
                  id="reg-specialization"
                  required
                  value={regSpecialization}
                  onChange={(e) => setRegSpecialization(e.target.value)}
                  className={`w-full h-10 px-3 bg-white border border-peach rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body cursor-pointer ${
                    !regSpecialization ? 'text-slate-400' : 'text-navy'
                  }`}
                >
                  <option value="" disabled className="text-slate-400">
                    Select your specialization
                  </option>
                  {SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec} className="text-navy">
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reg-qualification"
                  className="block text-xs font-semibold text-navy font-body mb-1"
                >
                  Qualification (optional)
                </label>
                <input
                  id="reg-qualification"
                  type="text"
                  placeholder="Enter your qualifications (e.g., MBBS, MD)"
                  value={regQualification}
                  onChange={(e) => setRegQualification(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-peach rounded-xl text-xs text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body"
                />
              </div>
            </div>

            {/* 7. Experience & Hospital/Clinic */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label
                  htmlFor="reg-experience"
                  className="block text-xs font-semibold text-navy font-body mb-1"
                >
                  Experience (Years)
                </label>
                <input
                  id="reg-experience"
                  type="number"
                  min="0"
                  max="70"
                  placeholder="Enter your years of experience"
                  value={regExperienceYears}
                  onChange={(e) => setRegExperienceYears(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-peach rounded-xl text-xs text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="reg-hospital"
                  className="block text-xs font-semibold text-navy font-body mb-1"
                >
                  Hospital or Clinic Name (optional)
                </label>
                <input
                  id="reg-hospital"
                  type="text"
                  placeholder="Enter your hospital or clinic name"
                  value={regHospitalName}
                  onChange={(e) => setRegHospitalName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-peach rounded-xl text-xs text-navy placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand shadow-2xs font-body"
                />
              </div>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[48px] mt-2 px-6 bg-gradient-to-r from-[#8B6FE0] to-[#F2B8A8] text-white rounded-full text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-[0_10px_28px_-4px_rgba(139,111,224,0.48)] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-85 disabled:cursor-wait cursor-pointer font-body"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Registering Doctor Account...</span>
                </>
              ) : (
                <>
                  <span className="font-semibold">Complete Doctor Registration</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Back to Login Link */}
            <div className="mt-3 text-center relative z-10">
              <p className="text-xs text-navysoft font-body">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    setRegSuccessMessage(null);
                    setMode('login');
                  }}
                  className="font-bold text-navy hover:text-brand transition-colors cursor-pointer ml-1 inline-flex items-center gap-1 group"
                >
                  <span>Sign In</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </p>
            </div>
          </form>
        )}
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
};
