import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { AlertCircle, Clock, Database } from 'lucide-react';

interface Props {
  preset: string;
}

export const DocumentsValidationPage: React.FC<Props> = ({ preset }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-documents', preset],
    queryFn: () => adminConsoleApi.getDocumentsAnalytics({ preset }),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading document & OCR analytics...</div>;
  }

  const { uploadedByType, ocrPerformance, fieldVerificationDistribution, formularyVersionInUse } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900">Document Processing & Deterministic Validation Gate</h2>
        <p className="text-xs text-slate-500">
          Module 4 document intake telemetry. Verification states represent deterministic gate decisions; no ground truth exists to claim "OCR accuracy".
        </p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Median OCR Latency</span>
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {ocrPerformance.medianProcessingTimeMs} ms
          </div>
          <span className="text-2xs text-slate-400">Total processed: {ocrPerformance.completedCount}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Needing Doctor Review</span>
          </span>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {data.documentsNeedingPhysicianReviewPercent}%
          </div>
          <span className="text-2xs text-slate-400">Unverified or flagged fields present</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Formulary Version</span>
          </span>
          <div className="text-sm font-bold font-mono text-emerald-800 mt-2">
            {formularyVersionInUse}
          </div>
          <span className="text-2xs text-slate-400">Reference drug dictionary</span>
        </div>
      </div>

      {/* Verification State Distribution & Uploaded Document Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <h3 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
            Field Verification State Distribution
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-emerald-700">VERIFIED</span>
                <span className="font-bold text-emerald-700">{fieldVerificationDistribution.VERIFIED}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${fieldVerificationDistribution.VERIFIED}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">UNVERIFIED (Requires Clinical Attention)</span>
                <span className="font-bold text-slate-700">{fieldVerificationDistribution.UNVERIFIED}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full" style={{ width: `${fieldVerificationDistribution.UNVERIFIED}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-amber-700">MISMATCH_FLAGGED (Formulary Discrepancy)</span>
                <span className="font-bold text-amber-700">{fieldVerificationDistribution.MISMATCH_FLAGGED}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${fieldVerificationDistribution.MISMATCH_FLAGGED}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-rose-700">UNREADABLE (Blurry / Occluded Capture)</span>
                <span className="font-bold text-rose-700">{fieldVerificationDistribution.UNREADABLE}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: `${fieldVerificationDistribution.UNREADABLE}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Uploads by Document Type */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <h3 className="text-xs font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
            Captured Documents by Type
          </h3>
          <div className="space-y-2">
            {uploadedByType.map((item: any) => (
              <div key={item.documentType} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 text-xs">
                <span className="font-medium text-slate-800">{item.documentType.replace('_', ' ')}</span>
                <span className="font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
