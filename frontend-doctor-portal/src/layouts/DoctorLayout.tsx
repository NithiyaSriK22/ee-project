import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { HealthCheckResponse, ApiResponse } from '../types/api.types';
import { useAuth } from '../features/auth/hooks/useAuth';
import {
  Stethoscope,
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
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Clinical Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">MediKiosk</span>
                <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
                  Doctor Review Portal
                </span>
              </div>
              <p className="text-xs text-slate-500">OPD Clinical Case Review & Confirmation System</p>
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
            <div className="w-8 h-8 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {getInitials(user?.fullName)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>{user?.fullName || 'OPD Physician'}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-mono border border-slate-200">
                  {user?.role || 'DOCTOR'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500">{user?.hospitalDepartment || 'Department of General Medicine'}</div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
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
        <aside className="w-64 bg-white border-r border-slate-200 p-4 hidden md:flex flex-col justify-between">
          <nav className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Clinical Workspace
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 border border-teal-200 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Physician Authority</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              AI summaries are draft aids only. Physician confirmation is required before medical records are finalized.
            </p>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Clinical Footer */}
      <footer className="bg-white border-t border-slate-200 py-2.5 px-6 text-xs text-slate-500 flex justify-between items-center">
        <span>MediKiosk SIH26047 — Clinical Decision-Support & Case-Taking Platform</span>
        <span className="flex items-center gap-1 font-mono text-[11px]">
          <Activity className="w-3 h-3 text-teal-600" /> Module 1 Foundation Active
        </span>
      </footer>
    </div>
  );
};
