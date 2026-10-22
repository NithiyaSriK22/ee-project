import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { redflagsApi } from '../api/redflags.api';
import { RuleTestSuiteResult } from '../types/redflags.types';
import { ArrowLeft, Play, CheckCircle2, XCircle, Send, Loader2 } from 'lucide-react';

export const RuleTestRunner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [testResult, setTestResult] = useState<RuleTestSuiteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data: rule, isLoading } = useQuery({
    queryKey: ['redflag-rule', id],
    queryFn: () => redflagsApi.getRuleById(id!),
    enabled: !!id,
  });

  const handleRunTests = async () => {
    if (!id) return;
    try {
      setRunning(true);
      const res = await redflagsApi.runRuleTests(id);
      setTestResult(res);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await redflagsApi.submitRuleForReview(id);
      setSubmitSuccess(true);
      setTimeout(() => navigate('/redflags/rules'), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !rule) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
        Loading rule details...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/redflags/rules')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                {rule.ruleCode}
              </span>
              <h1 className="text-2xl font-black text-slate-900">{rule.name}</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Automated test harness runner & clinical review gate</p>
          </div>
        </div>

        <button
          onClick={handleRunTests}
          disabled={running}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-all"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>Run Test Suite</span>
        </button>
      </div>

      {submitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Rule successfully submitted for clinical review! Redirecting...</span>
        </div>
      )}

      {/* Test Cases Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Configured Test Cases ({rule.testCases?.length || 0})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Gating requirement: 100% pass rate</span>
        </div>

        <div className="space-y-3">
          {(rule.testCases || []).map((tc, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>{tc.name}</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                  Expected: {tc.expectedOutcome}
                </span>
              </div>
              <div className="text-slate-500 font-mono text-[11px] overflow-x-auto">
                Facts: {JSON.stringify(tc.facts)}
              </div>
            </div>
          ))}
        </div>

        {/* Live Test Results Matrix */}
        {testResult && (
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Test Suite Execution Results</h3>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full border ${
                  testResult.passed
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                {testResult.passed ? 'ALL TESTS PASSED' : `${testResult.failedTests} TEST(S) FAILED`}
              </span>
            </div>

            <div className="space-y-2">
              {testResult.results.map((res, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    res.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {res.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                    <span className="font-bold text-slate-800">{res.testCaseName}</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-slate-500">Exp: {res.expectedOutcome}</span>
                    <span className="text-slate-800 font-bold">Got: {res.actualOutcome}</span>
                  </div>
                </div>
              ))}
            </div>

            {testResult.passed && rule.status === 'DRAFT' && (
              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow transition-all"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit for Clinical Review</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
