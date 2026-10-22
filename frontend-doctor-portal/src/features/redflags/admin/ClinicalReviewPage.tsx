import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { redflagsApi } from '../api/redflags.api';
import { ArrowLeft, ShieldCheck, AlertCircle, FileCheck2, Loader2 } from 'lucide-react';

export const ClinicalReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rule, isLoading } = useQuery({
    queryKey: ['redflag-rule', id],
    queryFn: () => redflagsApi.getRuleById(id!),
    enabled: !!id,
  });

  const handleApprove = async () => {
    if (!id) return;
    setError(null);
    try {
      setApproving(true);
      await redflagsApi.approveRule(id);
      navigate('/redflags/rules');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  if (isLoading || !rule) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
        Loading rule for clinical review...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/redflags/rules')}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
              PENDING CLINICAL SIGN-OFF
            </span>
            <h1 className="text-2xl font-black text-slate-900">{rule.name}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Clinical governance review & separation of duties verification</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Governance & Rule Review Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs sm:text-sm flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Separation of Duties Policy:</strong> Only authorized medical clinicians (Doctors)
            who did not author this rule may approve and activate it for live patient case-taking.
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Rule Code</span>
              <span className="font-mono font-bold text-slate-900">{rule.ruleCode} (v{rule.version})</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Severity Tier</span>
              <span className="font-bold text-rose-600">{rule.severityTier}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 block uppercase">Clinical Description</span>
            <p className="text-slate-800 font-medium">{rule.description}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 block uppercase">Recommended Staff Action</span>
            <p className="text-slate-800 font-bold bg-amber-50 p-3 rounded-xl border border-amber-200">
              {rule.recommendedStaffAction}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 block uppercase">Structured Condition Tree</span>
            <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
              {JSON.stringify(rule.conditionTree, null, 2)}
            </pre>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Authored by: <strong className="text-slate-700">{rule.createdBy || 'Staff Attendant'}</strong>
            </span>

            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-all"
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
              <span>Clinically Sign & Activate Rule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
