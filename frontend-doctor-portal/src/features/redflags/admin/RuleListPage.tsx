import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { redflagsApi } from '../api/redflags.api';
import { RedFlagRule } from '../types/redflags.types';
import { ShieldCheck, Plus, CheckCircle, FileCheck2 } from 'lucide-react';

export const RuleListPage: React.FC = () => {
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['redflag-rules'],
    queryFn: () => redflagsApi.getRules(),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CLINICAL_REVIEW':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'RETIRED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-sky-600" />
            <span>Red-Flag Clinical Rules</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Deterministic, clinician-approved triage rules gating emergency alerts.
          </p>
        </div>

        <Link
          to="/redflags/rules/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Author New Rule</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          Loading red-flag rules catalog...
        </div>
      ) : rules.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          No red-flag rules registered.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule: RedFlagRule) => (
            <div
              key={rule.id}
              className="p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-slate-300 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {rule.ruleCode}
                    </span>
                    <span className="text-xs font-bold text-slate-400">v{rule.version}</span>
                    {rule.isIllustrative && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        Illustrative
                      </span>
                    )}
                  </div>

                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${getStatusBadge(rule.status)}`}>
                    {rule.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{rule.name}</h3>
                <p className="text-xs font-medium text-slate-600 line-clamp-2">{rule.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Tier: {rule.severityTier}</span>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/redflags/rules/${rule.id}/tests`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Run Tests</span>
                  </Link>

                  {rule.status === 'CLINICAL_REVIEW' && (
                    <Link
                      to={`/redflags/rules/${rule.id}/review`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Review Sign-off</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
