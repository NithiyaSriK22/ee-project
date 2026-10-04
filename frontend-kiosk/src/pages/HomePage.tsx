import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { HealthCheckResponse, ApiResponse } from '../types/api.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { UserCheck, Users, Activity, FileText, Stethoscope, ArrowRight, Shield } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-100 text-sky-800 text-sm font-semibold mb-3 border border-sky-200">
          <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
          <span>Hospital OPD Pre-Consultation System</span>
        </div>
        <h1 className="text-kiosk-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Welcome to MediKiosk
        </h1>
        <p className="text-kiosk-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Please complete your medical case intake before meeting the doctor. Your answers and old prescriptions will help your physician prepare your consultation.
        </p>
      </div>

      {/* Primary Intake Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card interactive className="flex flex-col justify-between p-8 border-sky-300 hover:border-sky-500 bg-white">
          <div>
            <div className="p-4 bg-sky-100 text-sky-700 rounded-2xl w-fit mb-6">
              <UserCheck className="w-10 h-10" />
            </div>
            <h2 className="text-kiosk-xl font-bold text-slate-900 mb-2">Self Intake (Patient)</h2>
            <p className="text-kiosk-base text-slate-600 mb-6 leading-relaxed">
              Answer simple questions by voice or touch. You can scan past prescriptions and lab reports at the next step.
            </p>
          </div>
          <Button
            variant="kiosk-action"
            size="kiosk-touch"
            className="w-full"
            rightIcon={<ArrowRight className="w-6 h-6" />}
            onClick={() => navigate('/register')}
          >
            Start Patient Intake
          </Button>
        </Card>

        <Card interactive className="flex flex-col justify-between p-8 border-teal-300 hover:border-teal-500 bg-white">
          <div>
            <div className="p-4 bg-teal-100 text-teal-700 rounded-2xl w-fit mb-6">
              <Users className="w-10 h-10" />
            </div>
            <h2 className="text-kiosk-xl font-bold text-slate-900 mb-2">Companion / Staff Assisted</h2>
            <p className="text-kiosk-base text-slate-600 mb-6 leading-relaxed">
              Family members, companions, or hospital OPD staff attendants can help enter patient information together.
            </p>
          </div>
          <Button
            variant="secondary"
            size="kiosk-touch"
            className="w-full font-semibold text-kiosk-lg min-h-[72px] rounded-2xl"
            rightIcon={<ArrowRight className="w-6 h-6" />}
            onClick={() => navigate('/register')}
          >
            Assisted Intake Mode
          </Button>
        </Card>
      </div>

      {/* System Safety Notice Banner */}
      <Alert variant="info" title="Trust & Clinical Safety Assurance" className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-sky-600 flex-shrink-0" />
            <span className="text-sm text-slate-700">
              MediKiosk assists in organizing patient information into a structured summary. It does not diagnose or prescribe. The treating physician always reviews, edits, and confirms your clinical record.
            </span>
          </div>
        </div>
      </Alert>

      {/* Live Backend Connection Diagnostic (Module 1 Verification Indicator) */}
      <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-amber-400 animate-ping' : isError ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span className="font-semibold text-slate-700">Backend API Connectivity:</span>
          {isLoading ? (
            <span className="text-slate-500">Checking health...</span>
          ) : isError ? (
            <span className="text-rose-600 font-medium">Server Offline (Verify backend on :5000)</span>
          ) : (
            <span className="text-emerald-700 font-medium">
              Connected ({healthData?.service} - Uptime {healthData?.uptimeSeconds}s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Module 1 Foundation
          </span>
          <span className="inline-flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-slate-400" /> SIH26047 MediKiosk
          </span>
        </div>
      </div>
    </div>
  );
};
