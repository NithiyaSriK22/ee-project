import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { ShieldAlert } from 'lucide-react';

export const AccessReportsPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-access-reports', selectedType],
    queryFn: () => adminConsoleApi.getAccessReports({ anomalyType: selectedType || undefined }),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading compliance access reports...</div>;
  }

  const { reportItems, summary } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <span>Patient Record Access & Governance Audit Reports</span>
        </h2>
        <p className="text-xs text-slate-500">
          Section 19 auditor reports highlighting access patterns requiring human clinical governance review. Wording is strictly objective and non-judgmental.
        </p>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'OUT_OF_QUEUE_ACCESS', label: 'Out of Queue', count: summary.OUT_OF_QUEUE_ACCESS, color: 'text-amber-700' },
          { key: 'CROSS_DEPARTMENT_VIEW', label: 'Cross-Dept Views', count: summary.CROSS_DEPARTMENT_VIEW, color: 'text-blue-700' },
          { key: 'REVIEW_TAKEOVER', label: 'Review Overrides', count: summary.REVIEW_TAKEOVER, color: 'text-purple-700' },
          { key: 'REPEATED_DENIED_ACCESS', label: 'Denied Attempts', count: summary.REPEATED_DENIED_ACCESS, color: 'text-rose-700' },
          { key: 'OUTSIDE_OPERATING_HOURS', label: 'After-Hours', count: summary.OUTSIDE_OPERATING_HOURS, color: 'text-slate-700' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedType(selectedType === tab.key ? '' : tab.key)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedType === tab.key
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-2xs font-semibold text-slate-500 block">{tab.label}</span>
            <span className={`text-xl font-black mt-1 block ${tab.color}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Report Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-900">
            {selectedType ? `Filtered: ${selectedType.replace(/_/g, ' ')}` : 'All Access Governance Records'}
          </h3>
          <span className="text-2xs text-slate-500">{reportItems.length} records flagged for review</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-2xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Pattern Category</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Visit Ref</th>
                <th className="px-4 py-2.5">Recorded Reason & Justification</th>
                <th className="px-4 py-2.5">Objective Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No access governance anomalies recorded for this filter.
                  </td>
                </tr>
              ) : (
                reportItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-2xs text-slate-600 whitespace-nowrap">
                      {new Date(item.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-2xs">
                        {item.anomalyType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-slate-900 block">{item.actorRole}</span>
                      <span className="font-mono text-3xs text-slate-400">{item.actorId.slice(0, 12)}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-2xs text-slate-600">
                      {item.visitRef}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.reasonCode && (
                        <span className="font-semibold text-slate-800 block">{item.reasonCode}</span>
                      )}
                      {item.reasonText && (
                        <span className="text-slate-600 text-3xs italic block">{item.reasonText}</span>
                      )}
                      {!item.reasonCode && !item.reasonText && (
                        <span className="text-slate-400 text-3xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-2xs text-slate-600">
                      {item.explanation}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
