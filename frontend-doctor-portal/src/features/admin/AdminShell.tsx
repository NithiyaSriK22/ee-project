import React, { useState } from 'react';
import { useAuth } from '../auth/hooks/useAuth';
import {
  BarChart3,
  Users2,
  Languages,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  History,
  ShieldAlert,
  Activity,
  HardDrive,
  Download,
  UserCog,
  Sliders,
  Scale,
  Calendar,
  Clock,
  ShieldCheck,
  Info,
  X,
} from 'lucide-react';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { IntakeAnalyticsPage } from './pages/IntakeAnalyticsPage';
import { LanguageVoicePage } from './pages/LanguageVoicePage';
import { DocumentsValidationPage } from './pages/DocumentsValidationPage';
import { SummariesReviewPage } from './pages/SummariesReviewPage';
import { AlertsOperationsPage } from './pages/AlertsOperationsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { AccessReportsPage } from './pages/AccessReportsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { KioskFleetPage } from './pages/KioskFleetPage';
import { ReportsPage } from './pages/ReportsPage';
import { StaffAdminPage } from './pages/StaffAdminPage';
import { RetentionSettingsPage } from './pages/RetentionSettingsPage';
import { PilotEvaluationPage } from './pages/PilotEvaluationPage';
import { DeploymentSafetyPage } from './pages/DeploymentSafetyPage';

export type AdminTab =
  | 'overview'
  | 'deployment'
  | 'intake'
  | 'language'
  | 'documents'
  | 'summaries'
  | 'alerts'
  | 'audit'
  | 'access-reports'
  | 'health'
  | 'fleet'
  | 'reports'
  | 'staff'
  | 'retention'
  | 'pilot';

export const AdminShell: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [datePreset, setDatePreset] = useState<'today' | '7days' | '30days' | '90days'>('7days');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const userRole = user?.role || 'ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAuditor = userRole === 'AUDITOR' || isSuperAdmin;
  const isAnalyst = userRole === 'ANALYST' || isSuperAdmin || userRole === 'ADMIN';

  // Navigation items with RBAC visibility
  const navTabs: { id: AdminTab; label: string; icon: React.ReactNode; permitted: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" />, permitted: isAnalyst },
    { id: 'deployment', label: 'Release Gates & Safety', icon: <ShieldAlert className="w-4 h-4 text-rose-500" />, permitted: userRole === 'ADMIN' || isSuperAdmin },
    { id: 'intake', label: 'Intake & Visits', icon: <Users2 className="w-4 h-4" />, permitted: isAnalyst },
    { id: 'language', label: 'Language & Voice', icon: <Languages className="w-4 h-4" />, permitted: isAnalyst },
    { id: 'documents', label: 'Documents & OCR', icon: <FileSpreadsheet className="w-4 h-4" />, permitted: isAnalyst },
    { id: 'summaries', label: 'Summaries & Review', icon: <FileText className="w-4 h-4" />, permitted: isAnalyst },
    { id: 'alerts', label: 'Alert Pipeline', icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, permitted: isAnalyst },
    { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4 text-indigo-600" />, permitted: isAuditor || userRole === 'ADMIN' },
    { id: 'access-reports', label: 'Access Reports', icon: <ShieldAlert className="w-4 h-4 text-rose-600" />, permitted: isAuditor },
    { id: 'health', label: 'System Health', icon: <Activity className="w-4 h-4 text-emerald-600" />, permitted: userRole === 'ADMIN' || isSuperAdmin },
    { id: 'fleet', label: 'Kiosk Fleet', icon: <HardDrive className="w-4 h-4 text-slate-700" />, permitted: userRole === 'ADMIN' || isSuperAdmin },
    { id: 'reports', label: 'Reports & Exports', icon: <Download className="w-4 h-4" />, permitted: isAnalyst || isAuditor },
    { id: 'staff', label: 'Staff & Roles', icon: <UserCog className="w-4 h-4 text-blue-600" />, permitted: userRole === 'ADMIN' || isSuperAdmin },
    { id: 'retention', label: 'Retention & Holds', icon: <Sliders className="w-4 h-4" />, permitted: userRole === 'ADMIN' || isSuperAdmin },
    { id: 'pilot', label: 'Pilot Evaluation', icon: <Scale className="w-4 h-4 text-purple-600" />, permitted: isAnalyst },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Banner: Administrative Console Context */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 shadow-md border-b border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-bold tracking-tight text-white">
                THUNAI Administration, Analytics & System Monitoring
              </h1>
              <span className="rounded-full bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-semibold border border-indigo-400/30">
                Module 9
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
              <span>Privacy-conscious, clinical-content-free platform surveillance.</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-400 font-medium">Aggregated Metrics Only</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-300 font-medium">Small-Group Suppression Active (N &lt; 10)</span>
            </p>
          </div>

          {/* Controls: Date Preset & Central Metric Catalog Trigger */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Reporting Timezone Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Timezone: <strong>Asia/Kolkata (IST)</strong></span>
            </div>

            {/* Date Range Presets */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 ml-2 mr-1 text-slate-400" />
              {(['today', '7days', '30days', '90days'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    datePreset === preset
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {preset === 'today'
                    ? 'Today'
                    : preset === '7days'
                    ? '7D'
                    : preset === '30days'
                    ? '30D'
                    : '90D'}
                </button>
              ))}
            </div>

            {/* Metric Catalog Modal Trigger */}
            <button
              onClick={() => setIsCatalogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-xs font-semibold text-indigo-200 hover:text-white transition-all shadow-xs"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Metric Catalog</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Console Navigation Tabs */}
      <nav aria-label="Admin Navigation Tabs" className="bg-white border-b border-slate-200 px-6 overflow-x-auto shadow-xs">
        <div className="flex items-center gap-1 py-1.5">
          {navTabs
            .filter((t) => t.permitted)
            .map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>
      </nav>

      {/* Tab Content Display Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'overview' && <OverviewDashboard preset={datePreset} onOpenCatalog={() => setIsCatalogOpen(true)} />}
        {activeTab === 'deployment' && <DeploymentSafetyPage />}
        {activeTab === 'intake' && <IntakeAnalyticsPage preset={datePreset} />}
        {activeTab === 'language' && <LanguageVoicePage preset={datePreset} />}
        {activeTab === 'documents' && <DocumentsValidationPage preset={datePreset} />}
        {activeTab === 'summaries' && <SummariesReviewPage preset={datePreset} />}
        {activeTab === 'alerts' && <AlertsOperationsPage preset={datePreset} />}
        {activeTab === 'audit' && <AuditLogPage />}
        {activeTab === 'access-reports' && <AccessReportsPage />}
        {activeTab === 'health' && <SystemHealthPage />}
        {activeTab === 'fleet' && <KioskFleetPage />}
        {activeTab === 'reports' && <ReportsPage preset={datePreset} />}
        {activeTab === 'staff' && <StaffAdminPage />}
        {activeTab === 'retention' && <RetentionSettingsPage />}
        {activeTab === 'pilot' && <PilotEvaluationPage preset={datePreset} />}
      </main>

      {/* Metric Catalog Modal / Drawer */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Central Metric Catalog (v1.0.0)</h2>
              </div>
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              <p className="text-slate-600">
                Every metric across THUNAI is defined once in code and documentation. Changing a definition requires a version increment. No clinical content is used in computation.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">visit_started</span>
                    <span className="text-indigo-600 font-mono text-2xs bg-indigo-50 px-1.5 py-0.5 rounded">v1</span>
                  </div>
                  <p className="text-slate-600 mt-1">Total patient kiosk sessions initiated and checked-in at kiosk.</p>
                  <p className="text-slate-500 mt-0.5"><strong>Formula:</strong> Count of KIOSK_SESSION_STARTED events</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">interview_completion_rate</span>
                    <span className="text-indigo-600 font-mono text-2xs bg-indigo-50 px-1.5 py-0.5 rounded">v1</span>
                  </div>
                  <p className="text-slate-600 mt-1">Proportion of initiated guided interviews that reach full completion.</p>
                  <p className="text-slate-500 mt-0.5"><strong>Formula:</strong> visit_completed / visit_started</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">summary_fallback_rate</span>
                    <span className="text-indigo-600 font-mono text-2xs bg-indigo-50 px-1.5 py-0.5 rounded">v1</span>
                  </div>
                  <p className="text-slate-600 mt-1">Proportion of patient visit summaries that reverted to deterministic template mode.</p>
                  <p className="text-slate-500 mt-0.5"><strong>Formula:</strong> summaries_generated_fallback / all summaries</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">review_edit_rate</span>
                    <span className="text-indigo-600 font-mono text-2xs bg-indigo-50 px-1.5 py-0.5 rounded">v1</span>
                  </div>
                  <p className="text-slate-600 mt-1">System quality signal: confirmed records containing at least one doctor text modification.</p>
                  <p className="text-amber-700 font-medium mt-0.5">Rule: High edit rate is a prompt to investigate summary prompt quality; NEVER used as a doctor productivity score.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
