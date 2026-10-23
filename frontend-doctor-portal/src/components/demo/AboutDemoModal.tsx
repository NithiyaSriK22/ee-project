import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ApiResponse } from '../../types/api.types';
import { X, CheckCircle2, Play, RefreshCw, Shield } from 'lucide-react';

interface ComponentDisclosure {
  componentName: string;
  module: string;
  status: 'REAL' | 'MOCKED' | 'CANNED_SYNTHETIC';
  description: string;
  clinicalProductionReadiness: string;
}

interface AboutDemoData {
  environment: string;
  bannerMessage: string;
  disclaimer: string;
  components: ComponentDisclosure[];
}

interface Scenario {
  id: string;
  name: string;
  category: string;
  description: string;
  expectedOutcome: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDemoModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('happy_path');
  const [runResult, setRunResult] = useState<any>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const { data: aboutData } = useQuery<AboutDemoData>({
    queryKey: ['demo-about'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AboutDemoData>>('/demo/about');
      return res.data.data as AboutDemoData;
    },
    enabled: isOpen,
  });

  const { data: scenarios } = useQuery<Scenario[]>({
    queryKey: ['demo-scenarios'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Scenario[]>>('/demo/scenarios');
      return res.data.data as Scenario[];
    },
    enabled: isOpen,
  });

  const runScenarioMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiResponse<any>>(`/demo/scenarios/${id}/run`);
      return res.data.data;
    },
    onSuccess: (data) => {
      setRunResult(data);
      setResetMessage(null);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<any>>('/demo/reset');
      return res.data.data;
    },
    onSuccess: () => {
      setResetMessage('Demo sandbox reset to clean baseline state.');
      setRunResult(null);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-400 border-b border-amber-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-slate-950" />
            <div>
              <h2 className="text-lg font-black text-slate-950 uppercase tracking-tight">About This Demonstration</h2>
              <p className="text-xs font-semibold text-slate-800">Honest Component Disclosure & Interactive Scenario Runner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-900 hover:bg-amber-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs / Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Disclaimer Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed font-medium">
            <strong>Honest Disclosure Policy:</strong> All patient identities and clinical test values in this demonstration environment are purely synthetic. Synthetic handwriting and TTS audio are designed to test software pipeline robustness and failure handling, never to assert clinical diagnostic claim.
          </div>

          {/* Component Real vs Mocked Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Real vs Mocked vs Canned Architectural Breakdown</span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="p-3">Component</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Implementation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aboutData?.components.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="p-3 font-semibold text-slate-900">{c.componentName}</td>
                      <td className="p-3 text-slate-600">{c.module}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide uppercase ${
                            c.status === 'REAL'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : c.status === 'MOCKED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Scenario Runner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-sky-600" />
              <span>Scripted Scenario Runner (12 Scenarios)</span>
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-hidden flex-1 min-w-[260px]"
              >
                {scenarios?.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.category}] {s.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => runScenarioMutation.mutate(selectedScenario)}
                disabled={runScenarioMutation.isPending}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{runScenarioMutation.isPending ? 'Executing...' : 'Run Scenario'}</span>
              </button>

              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
                <span>Reset Sandbox</span>
              </button>
            </div>

            {/* Reset Message */}
            {resetMessage && (
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{resetMessage}</span>
              </div>
            )}

            {/* Execution Result */}
            {runResult && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900">{runResult.scenarioName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${runResult.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {runResult.passed ? 'PASSED (VERIFIED)' : 'FAILED'}
                  </span>
                </div>
                <p className="text-slate-600">
                  Executed {runResult.executedSteps} of {runResult.totalSteps} steps in {runResult.durationMs}ms
                </p>
                <div className="space-y-1 pt-1 border-t border-slate-100 max-h-40 overflow-y-auto">
                  {runResult.stepDetails?.map((st: any) => (
                    <div key={st.step} className="flex items-start gap-2 text-[11px]">
                      <span className="text-emerald-600 font-bold">✓ Step {st.step}:</span>
                      <span className="text-slate-700">{st.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close Disclosure
          </button>
        </div>
      </div>
    </div>
  );
};
