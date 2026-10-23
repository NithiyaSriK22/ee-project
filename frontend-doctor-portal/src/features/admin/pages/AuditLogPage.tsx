import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { History, ShieldCheck, Search, CheckCircle2, AlertTriangle } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [searchAction, setSearchAction] = useState('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-logs', searchAction],
    queryFn: () => adminConsoleApi.getAuditLogs({ action: searchAction || undefined, limit: 50 }),
  });

  const verifyMutation = useMutation({
    mutationFn: () => adminConsoleApi.verifyAuditChain(),
    onSuccess: (res) => {
      setVerificationResult(res);
      refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Tamper-Evident Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500">
            Append-only, SHA-256 hash-chained immutable activity log. All access to this log is itself recorded.
          </p>
        </div>

        {/* Chain Verification Button */}
        <button
          onClick={() => verifyMutation.mutate()}
          disabled={verifyMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{verifyMutation.isPending ? 'Verifying Chain...' : 'Verify Hash Chain'}</span>
        </button>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 shadow-2xs ${
            verificationResult.valid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {verificationResult.valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {verificationResult.valid ? 'Audit Chain Intact & Fully Verified' : 'Audit Chain Tampering Detected!'}
            </div>
            <p>{verificationResult.details}</p>
            <div className="font-mono text-2xs text-slate-600 mt-1">
              Head Hash: {verificationResult.headHash} | Verified Count: {verificationResult.verifiedCount} records
            </div>
          </div>
        </div>
      )}

      {/* Search Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by action code (e.g. RECORD_CONFIRMED, STAFF_ROLE_CHANGED)..."
          value={searchAction}
          onChange={(e) => setSearchAction(e.target.value)}
          className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-2xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Seq #</th>
                <th className="px-4 py-2.5">Timestamp (UTC)</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Entity</th>
                <th className="px-4 py-2.5">Result</th>
                <th className="px-4 py-2.5">IP Address</th>
                <th className="px-4 py-2.5">Record Hash (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">Loading audit records...</td>
                </tr>
              ) : data?.logs?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">No matching audit logs found.</td>
                </tr>
              ) : (
                data?.logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-2xs text-slate-500">#{log.sequenceNumber}</td>
                    <td className="px-4 py-2.5 text-2xs text-slate-600 whitespace-nowrap">
                      {new Date(log.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-slate-900 block">{log.actorRole || 'SYSTEM'}</span>
                      <span className="font-mono text-3xs text-slate-400">{log.actorId ? log.actorId.slice(0, 12) : 'SYSTEM'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-2xs">
                        {log.action}
                      </span>
                      {log.reasonText && (
                        <span className="block text-3xs text-slate-500 mt-0.5 italic">{log.reasonText}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-2xs text-slate-600">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-3xs font-bold uppercase ${
                          log.result === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-2xs text-slate-500">
                      {log.ipAddress}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-3xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded block truncate max-w-[140px]" title={log.recordHash}>
                        {log.recordHash}
                      </span>
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
