import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { Download, PlusCircle } from 'lucide-react';

interface Props {
  preset: string;
}

export const ReportsPage: React.FC<Props> = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('MONTHLY_OPERATIONS');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('ANALYTICS_AGGREGATES');
  const [exportFormat, setExportFormat] = useState('CSV');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminConsoleApi.getReports(),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      adminConsoleApi.queueReport({
        reportType: selectedType,
        startDate: '2026-10-01',
        endDate: '2026-10-23',
        reportingTimezone: 'Asia/Kolkata',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      adminConsoleApi.createExport({
        exportType,
        format: exportFormat,
        startDate: '2026-10-01',
        endDate: '2026-10-23',
      }),
    onSuccess: () => {
      setIsExportModalOpen(false);
      alert('Privacy-preserving aggregate export generated successfully.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            <span>Automated Reports & Privacy-Safe Data Exports</span>
          </h2>
          <p className="text-xs text-slate-500">
            Generated from pre-aggregated figures with small-number suppression applied. Row-level patient data is never exported.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Export</span>
          </button>
        </div>
      </div>

      {/* Queue Report Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-900 mb-2">Queue Scheduled Report Run</h3>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="MONTHLY_OPERATIONS">Monthly Operations Report</option>
            <option value="INTAKE">Kiosk and Intake Report</option>
            <option value="LANGUAGE_ACCESSIBILITY">Language & Accessibility Report</option>
            <option value="DOCUMENTS_VALIDATION">Document & Validation Report</option>
            <option value="SUMMARY_REVIEW">Summary & Review Quality Report</option>
            <option value="ALERT_PIPELINE">Alert Pipeline Safety Report</option>
            <option value="SYSTEM_RELIABILITY">System Reliability Report</option>
            <option value="PILOT_EVALUATION">Pilot Evaluation Report</option>
          </select>

          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{generateMutation.isPending ? 'Queuing Report...' : 'Generate Report Now'}</span>
          </button>
        </div>
      </div>

      {/* Reports Run Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-900">Generated Administrative Reports</h3>
          <span className="text-2xs text-slate-500">Expiring download artifacts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-2xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Report Type</th>
                <th className="px-4 py-2.5">Date Range</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Timezone</th>
                <th className="px-4 py-2.5">Generated By</th>
                <th className="px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Loading reports...</td>
                </tr>
              ) : data?.reports?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">No generated reports yet.</td>
                </tr>
              ) : (
                data?.reports?.map((report: any) => (
                  <tr key={report.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      {report.reportType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2.5 text-2xs text-slate-600">
                      {report.dateRangeStart} → {report.dateRangeEnd}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-3xs font-bold bg-emerald-100 text-emerald-800">
                        {report.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-2xs text-slate-500">
                      {report.reportingTimezone}
                    </td>
                    <td className="px-4 py-2.5 text-2xs text-slate-600">
                      {report.generatedBy}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => alert(`Downloading report ${report.id} (audited).`)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download CSV</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Generate Privacy-Preserving Export</h3>
            <p className="text-xs text-slate-600">
              Select aggregate data category. Minimum group size suppression (&lt; 10 masked) is automatically applied.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Export Type</label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ANALYTICS_AGGREGATES">Aggregated Operational Metrics</option>
                  <option value="AUDIT_LOGS">Audit Trail Log (Restricted Fields Masked)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="CSV">CSV Spreadsheet</option>
                  <option value="JSON">Structured JSON</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
              >
                {exportMutation.isPending ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
