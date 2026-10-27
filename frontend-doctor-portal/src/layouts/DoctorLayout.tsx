import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { HealthCheckResponse, ApiResponse } from '../types/api.types';
import { useAuth } from '../features/auth/hooks/useAuth';
import { IdleLockModal } from '../features/auth/components/IdleLockModal';
import { HospitalCross } from '../components/ui/HospitalCross';
import { NotificationPreferencesModal } from '../features/notifications';
import { SupportModal } from '../components/modals/SupportModal';
import { ClinicalGuidelinesModal } from '../components/modals/ClinicalGuidelinesModal';
import {
  Users,
  FileCheck2,
  FileCode2,
  History,
  ShieldCheck,
  LogOut,
  Bell,
  BarChart3,
  BookOpen,
  Compass,
  Settings,
  Headphones,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const DoctorLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const { data: healthData, isLoading, isError } = useQuery<HealthCheckResponse>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<HealthCheckResponse>>('/health');
      return res.data.data as HealthCheckResponse;
    },
    refetchInterval: 15000,
  });

  const formatUptime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'DN';
    const parts = name.replace(/^Dr\.\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || 'DN';
  };

  const doctorName = user?.fullName || 'Dr. Nithiya Sri';
  const doctorDepartment = user?.hospitalDepartment || 'OPD General Medicine';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col antialiased text-slate-800">
      {/* Top Clinical Header Matching Reference Image */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 px-6 py-3 flex items-center justify-between shadow-xs">
        {/* Left Brand Emblem & Portal Title */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#064e3b] text-white flex items-center justify-center shadow-sm shadow-[#064e3b]/20 transition-transform group-hover:scale-105">
              <HospitalCross className="h-5 w-5" fill="white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 tracking-tight">THUNAI</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-700 tracking-wide -mt-0.5">
                Doctor Review Portal
              </p>
            </div>
          </Link>
        </div>

        {/* Center / Right Section */}
        <div className="flex items-center gap-5">
          {/* Real Backend Connection Status Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200 text-xs shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isLoading
                  ? 'bg-amber-400'
                  : isError
                  ? 'bg-rose-500'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span className="text-slate-500 font-medium">Backend:</span>
            <span
              className={`font-semibold ${
                isError ? 'text-rose-600' : 'text-emerald-800'
              }`}
            >
              {isLoading
                ? 'Checking status...'
                : isError
                ? 'Disconnected'
                : `Healthy (Uptime ${formatUptime(healthData?.uptimeSeconds)})`}
            </span>
          </div>

          {/* Notification Bell with Badge */}
          <Link
            to="/notifications"
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Operational Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-teal-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-xs">
              3
            </span>
          </Link>

          {/* Authenticated Doctor Profile Pill & Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left"
              aria-expanded={isProfileMenuOpen}
            >
              <div className="w-9 h-9 rounded-full bg-[#064e3b] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-emerald-100">
                {getInitials(doctorName)}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {doctorName}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {doctorDepartment}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-0.5" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="font-bold text-slate-900">{doctorName}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{user?.email || 'doctor@thunai-health.internal'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 font-semibold rounded text-[10px] border border-emerald-200">
                    {user?.role || 'DOCTOR'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsGuidelinesOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Compass className="w-4 h-4 text-slate-400" />
                    <span>Clinical Guidelines</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsPreferencesOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Notification Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsSupportOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Headphones className="w-4 h-4 text-slate-400" />
                    <span>Contact Support</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer font-bold"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar — Exact Deep Forest Green / Teal Styling */}
        <aside className="w-64 bg-[#064e3b] text-white p-4 hidden md:flex flex-col justify-between shadow-lg shrink-0">
          <div className="space-y-6">
            {/* Section 1: Clinical Workspace */}
            <div>
              <div className="px-3 mb-2 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Clinical Workspace
              </div>
              <nav className="space-y-1">
                <Link
                  to="/"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    location.pathname === '/'
                      ? 'bg-[#d1fae5] text-[#064e3b] font-bold shadow-xs'
                      : 'text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <Users className={`w-4 h-4 ${location.pathname === '/' ? 'text-[#064e3b]' : 'text-emerald-300'}`} />
                  <span>OPD Intake Queue</span>
                </Link>

                <Link
                  to="/review"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    location.pathname.startsWith('/review')
                      ? 'bg-[#d1fae5] text-[#064e3b] font-bold shadow-xs'
                      : 'text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <FileCheck2 className={`w-4 h-4 ${location.pathname.startsWith('/review') ? 'text-[#064e3b]' : 'text-emerald-300'}`} />
                  <span>Summary Review</span>
                </Link>

                <Link
                  to="/patients"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    location.pathname === '/patients'
                      ? 'bg-[#d1fae5] text-[#064e3b] font-bold shadow-xs'
                      : 'text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${location.pathname === '/patients' ? 'text-[#064e3b]' : 'text-emerald-300'}`} />
                  <span>Patient Records</span>
                </Link>


                {['ADMIN', 'SUPER_ADMIN', 'ANALYST', 'AUDITOR', 'DOCTOR'].includes(user?.role || 'DOCTOR') && (
                  <Link
                    to="/admin/analytics"
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-[#d1fae5] text-[#064e3b] font-bold shadow-xs'
                        : 'text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium'
                    }`}
                  >
                    <BarChart3 className={`w-4 h-4 ${location.pathname.startsWith('/admin') ? 'text-[#064e3b]' : 'text-emerald-300'}`} />
                    <span>Admin & Analytics</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Section 2: Resources */}
            <div>
              <div className="px-3 mb-2 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Resources
              </div>
              <nav className="space-y-1">
                <Link
                  to="/admin/templates"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-emerald-300" />
                  <span>Question Bank</span>
                </Link>

                <Link
                  to="/admin/templates"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium transition-colors"
                >
                  <FileCode2 className="w-4 h-4 text-emerald-300" />
                  <span>Templates</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsGuidelinesOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium transition-colors text-left cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Clinical Guidelines</span>
                </button>
              </nav>
            </div>

            {/* Section 3: System */}
            <div>
              <div className="px-3 mb-2 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                System
              </div>
              <nav className="space-y-1">
                <Link
                  to="/notifications"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    location.pathname === '/notifications'
                      ? 'bg-[#d1fae5] text-[#064e3b] font-bold shadow-xs'
                      : 'text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <Bell className={`w-4 h-4 ${location.pathname === '/notifications' ? 'text-[#064e3b]' : 'text-emerald-300'}`} />
                  <span>Notifications</span>
                </Link>

                <Link
                  to="/audit"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    location.pathname === '/audit'
                      ? 'bg-[#d1fae5] text-[#064e3b] font-bold shadow-xs'
                      : 'text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <History className={`w-4 h-4 ${location.pathname === '/audit' ? 'text-[#064e3b]' : 'text-emerald-300'}`} />
                  <span>Audit Log</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-emerald-300" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Bottom Card: Need Help? Contact Support */}
          <div className="pt-4 border-t border-emerald-800/80">
            <button
              onClick={() => setIsSupportOpen(true)}
              className="w-full bg-[#d1fae5] text-[#064e3b] p-3 rounded-2xl flex items-center justify-between hover:bg-[#bbf7d0] transition-colors cursor-pointer text-left shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-[#064e3b]" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Need Help?</div>
                  <div className="text-[10px] text-[#064e3b]/80 font-medium">Contact Support</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#064e3b]/70" />
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer Matching Reference Screenshot */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span>THUNAI © 2025</span>
          <span>|</span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            OPD Clinical Case Review & Confirmation System
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Version 1.0.0
        </div>
      </footer>

      {/* Shared Modals */}
      <IdleLockModal />
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
      <ClinicalGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />
    </div>
  );
};
