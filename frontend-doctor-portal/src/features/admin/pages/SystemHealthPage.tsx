import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock } from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => adminConsoleApi.getSystemHealth(),
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Checking system health status...</div>;
  }

  const { overallStatus, components } = data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>HEALTHY</span>
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3" />
            <span>DEGRADED</span>
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3" />
            <span>UNAVAILABLE</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-slate-100 text-slate-700">
            UNKNOWN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Platform Subsystem Health Monitoring</h2>
            {getStatusBadge(overallStatus)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real health checks across platform storage, AI inference engines, alert pipelines, and audit chain integrity. Secrets and credentials remain strictly redacted.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Component Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components.map((c: any) => (
          <div key={c.component} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">{c.component.replace(/_/g, ' ')}</span>
                {getStatusBadge(c.status)}
              </div>
              <div className="mt-2 text-2xs text-slate-500 space-y-1">
                {c.details &&
                  Object.entries(c.details).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-mono text-slate-700">{String(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-between items-center text-3xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Latency: <strong>{c.latencyMs} ms</strong></span>
              </span>
              <span>Updated: {new Date(c.lastChecked).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
