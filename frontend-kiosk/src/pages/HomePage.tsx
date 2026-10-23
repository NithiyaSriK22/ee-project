import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { HealthCheckResponse, ApiResponse } from '../types/api.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { UserCheck, Users, Activity, FileText, Stethoscope, ArrowRight, Shield, Smartphone, QrCode } from 'lucide-react';
import { useLanguage } from '../features/language/useLanguage';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { locale, currentLanguage } = useLanguage();

  // TanStack Query live health check to backend API
  const { data: healthData, isLoading, isError } = useQuery<HealthCheckResponse>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<HealthCheckResponse>>('/health');
      return res.data.data as HealthCheckResponse;
    },
    refetchInterval: 30000,
  });

  return (
    <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full py-6">
      {/* Hospital OPD Greeting Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-800 text-sm font-semibold mb-3 border border-teal-200">
          <Activity className="w-4 h-4 text-teal-700 animate-pulse" />
          <span>{locale.homeSystemBadge}</span>
        </div>
        <h1 className="text-kiosk-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          {locale.homeTitle}
        </h1>
        <p className="text-kiosk-lg text-teal-900 font-semibold mb-2">
          {locale.homeSubtitle}
        </p>
        <p className="text-kiosk-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {locale.homeIntro}
        </p>
      </div>

      {/* Primary Intake Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card interactive className="flex flex-col justify-between p-8 border-teal-200 hover:border-teal-600 bg-white shadow-sm hover:shadow-md transition-all rounded-3xl">
          <div>
            <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl w-fit mb-6 border border-teal-100">
              <UserCheck className="w-10 h-10" />
            </div>
            <h2 className="text-kiosk-xl font-bold text-slate-900 mb-2">{locale.homeSelfIntakeTitle}</h2>
            <p className="text-kiosk-base text-slate-600 mb-6 leading-relaxed">
              {locale.homeSelfIntakeDesc}
            </p>
          </div>
          <Button
            variant="kiosk-action"
            size="kiosk-touch"
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-kiosk-lg min-h-[72px] rounded-2xl shadow-md shadow-teal-700/20 cursor-pointer"
            rightIcon={<ArrowRight className="w-6 h-6" />}
            onClick={() => navigate('/register')}
          >
            {locale.homeSelfIntakeAction}
          </Button>
        </Card>

        <Card interactive className="flex flex-col justify-between p-8 border-emerald-200 hover:border-emerald-600 bg-white shadow-sm hover:shadow-md transition-all rounded-3xl">
          <div>
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl w-fit mb-6 border border-emerald-100">
              <Users className="w-10 h-10" />
            </div>
            <h2 className="text-kiosk-xl font-bold text-slate-900 mb-2">{locale.homeAssistedTitle}</h2>
            <p className="text-kiosk-base text-slate-600 mb-6 leading-relaxed">
              {locale.homeAssistedDesc}
            </p>
          </div>
          <Button
            variant="secondary"
            size="kiosk-touch"
            className="w-full font-semibold text-kiosk-lg min-h-[72px] rounded-2xl border-2 border-stone-300 hover:bg-stone-50 text-slate-800 cursor-pointer"
            rightIcon={<ArrowRight className="w-6 h-6" />}
            onClick={() => navigate('/register')}
          >
            {locale.homeAssistedAction}
          </Button>
        </Card>
      </div>

      {/* Remote Mobile Patient Entry Callout (P3.1) */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-md border border-teal-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-800/80 border border-teal-600 flex items-center justify-center shrink-0 text-teal-200">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-1.5 border border-teal-400/30">
              <QrCode className="w-3.5 h-3.5" />
              <span>{locale.homeMobileEntryBadge}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {locale.homeMobileEntryTitle}
            </h2>
            <p className="text-sm text-teal-100/90 max-w-xl mt-1 leading-relaxed">
              {locale.homeMobileEntryDesc}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/portal')}
          className="w-full md:w-auto px-6 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2.5 shrink-0 text-base cursor-pointer"
        >
          <span>{locale.homeMobileEntryAction}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* System Safety Notice Banner */}
      <Alert variant="info" title={locale.homeSafetyNoticeTitle} className="mb-6 border-teal-200 bg-teal-50/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-teal-700 shrink-0" />
            <span className="text-sm text-slate-700 leading-relaxed">
              {locale.homeSafetyNoticeDesc}
            </span>
          </div>
        </div>
      </Alert>

      {/* Live Backend Connection Diagnostic */}
      <div className="bg-stone-100/90 rounded-2xl p-4 border border-stone-200 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-amber-400 animate-ping' : isError ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span className="font-semibold text-slate-700">{locale.homeBackendApiLabel}</span>
          {isLoading ? (
            <span className="text-slate-500">{locale.homeCheckingHealth}</span>
          ) : isError ? (
            <span className="text-rose-600 font-medium">{locale.homeServerOffline}</span>
          ) : (
            <span className="text-emerald-700 font-medium">
              {locale.homeServerConnected} ({healthData?.service} - {healthData?.uptimeSeconds}s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            {currentLanguage === 'ta' ? 'சரிபார்க்கப்பட்ட கட்டமைப்பு' : 'Verified Intake Architecture'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" /> THUNAI Platform
          </span>
        </div>
      </div>
    </div>
  );
};
