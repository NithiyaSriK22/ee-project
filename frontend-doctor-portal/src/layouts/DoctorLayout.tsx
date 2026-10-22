import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { HealthCheckResponse, ApiResponse } from '../types/api.types';
import { useAuth } from '../features/auth/hooks/useAuth';
import { IdleLockModal } from '../features/auth/components/IdleLockModal';
import { HospitalCross } from '../components/ui/HospitalCross';
import {
  Users,
  AlertTriangle,
  FileCheck2,
  FileCode2,
  Database,
  History,
  Activity,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export const DoctorLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
    refetchInterval: 30000,
  });

  const navItems = [
    { name: 'OPD Intake Queue', path: '/', icon: <Users className="w-4 h-4" /> },
    { name: 'Question Bank & Templates', path: '/admin/templates', icon: <FileCode2 className="w-4 h-4 text-purple-600" /> },
    { name: 'Summary Review', path: '/review', icon: <FileCheck2 className="w-4 h-4" /> },
    { name: 'Red-Flag Alerts', path: '/redflags', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
    { name: 'Formulary Reference', path: '/formulary', icon: <Database className="w-4 h-4" /> },
    { name: 'Clinical Audit Log', path: '/audit', icon: <History className="w-4 h-4" /> },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'DR';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
      {/* Top Clinical Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-red-100 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {/* Hospital Red Cross Emblem */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-md shadow-red-600/20">
              <HospitalCross className="h-5 w-5" fill="white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 tracking-tight">MediKiosk</span>
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                  Doctor Review Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">OPD Clinical Case Review & Confirmation System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live Backend Connection Indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400' : isError ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <span className="text-slate-600 font-medium">Backend:</span>
            <span className={isError ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
              {isLoading ? 'Checking' : isError ? 'Disconnected' : `${healthData?.status} (Uptime ${healthData?.uptimeSeconds}s)`}
            </span>
          </div>

          {/* Doctor Profile Badge & Logout */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-red-100">
              {getInitials(user?.fullName)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>{user?.fullName || 'OPD Physician'}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-50 text-red-700 font-mono font-bold border border-red-200">
                  {user?.role || 'DOCTOR'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">{user?.hospitalDepartment || 'Department of General Medicine'}</div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-1"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 hidden md:flex flex-col justify-between shadow-xs">
          <nav className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
              <HospitalCross className="w-3.5 h-3.5" fill="#DC2626" />
              <span>Clinical Workspace</span>
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-red-50 text-red-700 border border-red-200 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-red-50/50 hover:text-red-700 font-medium'
                  }`}
                >
                  <span className={isActive ? 'text-red-600' : 'text-slate-500'}>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3.5 bg-red-50/60 rounded-xl border border-red-200 text-xs text-slate-700">
            <div className="flex items-center gap-1.5 font-bold text-red-800 mb-1">
              <ShieldCheck className="w-4 h-4 text-red-600" />
              <span>Physician Authority</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              AI summaries are draft aids only. Treating physician confirmation is required before medical records are finalized.
            </p>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Clinical Footer */}
      <footer className="bg-white border-t border-slate-200 py-2.5 px-6 text-xs text-slate-500 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <HospitalCross className="w-3.5 h-3.5" fill="#DC2626" />
          <span>MediKiosk SIH26047 — Clinical Decision-Support & Case-Taking Platform</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-red-700 font-semibold bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
          <Activity className="w-3 h-3 text-red-600" /> Hospital Red & White Theme Active
        </span>
      </footer>
      {/* Shared Workstation Idle Auto-Lock Modal (Section 23) */}
      <IdleLockModal />
    </div>
  );
};
