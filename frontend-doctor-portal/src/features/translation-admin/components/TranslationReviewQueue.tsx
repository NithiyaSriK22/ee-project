import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { translationsApi } from '../translations.api';
import { QuestionTranslation, OptionTranslation } from '../types';
import { useAuth } from '../../auth/hooks/useAuth';

export const TranslationReviewQueue: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: pendingItems = [], isLoading } = useQuery<(QuestionTranslation | OptionTranslation)[]>({
    queryKey: ['translations-in-review'],
    queryFn: () => translationsApi.getTranslations({ status: 'IN_REVIEW' }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => translationsApi.approveTranslation(id, note),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['translations-in-review'] });
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['admin-translations-list'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Approval rejected by governance rules.');
    },
  });

  const isQuestion = (item: QuestionTranslation | OptionTranslation): item is QuestionTranslation => {
    return 'questionCode' in item;
  };

  const handleApprove = (item: QuestionTranslation | OptionTranslation) => {
    // Client-side warning check: separation of duties
    if (user?.id && item.createdBy === user.id) {
      setErrorMessage('Separation of Duties Violation: The author of a translation cannot approve their own submission.');
      return;
    }
    approveMutation.mutate({
      id: item.id,
      note: reviewNote[item.id] || 'Clinically verified for accuracy and neutral patient guidance.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Policy Callout */}
      <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-900">
        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Clinical Dual-Review & Separation of Duties</span>
          <span>
            Translations directly affect how patients understand questions about their health. The original author
            cannot approve their own submission. Clinician reviewers must confirm that translations preserve the exact
            clinical meaning and avoid leading or suggestive phrasing.
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Review Queue List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading pending translations...</div>
        ) : pendingItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Review Queue Empty</h3>
            <p className="text-xs text-slate-500 mt-1">All submitted translations have been reviewed and approved.</p>
          </div>
        ) : (
          pendingItems.map((item) => {
            const isQ = isQuestion(item);
            const isSelfAuthor = user?.id && item.createdBy === user.id;

            return (
              <div
                key={item.id}
                className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> In Review
                    </span>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {isQ ? `Question: ${item.questionCode}` : `Option: ${item.optionCode}`}
                    </span>
                    <span className="text-xs font-bold text-slate-600 uppercase">
                      Lang: <strong>{item.language}</strong>
                    </span>
                    <span className="text-xs font-mono text-slate-400">v{item.version}</span>
                  </div>

                  <span className="text-[11px] text-slate-400">Author: {item.createdBy}</span>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {isQ ? 'Translated Question Prompt' : 'Translated Option Label'}
                    </span>
                    <p className="text-sm font-bold text-slate-900">{isQ ? item.promptText : item.label}</p>
                    {isQ && item.helpText && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Plain Help Text:</span>
                        <p className="text-xs italic">{item.helpText}</p>
                      </div>
                    )}
                  </div>

                  {!isQ && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Approved Spoken Synonyms (Voice STT Matchers)
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.spokenSynonyms.map((syn, idx) => (
                          <span
                            key={idx}
                            className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] font-mono text-slate-800"
                          >
                            "{syn}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Separation of duties warning if reviewer is author */}
                {isSelfAuthor && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      You drafted this translation. A different clinical reviewer must approve it (Separation of
                      Duties).
                    </span>
                  </div>
                )}

                {/* Review Action Controls */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-2/3">
                    <input
                      type="text"
                      placeholder="Reviewer clinical verification notes (optional)..."
                      value={reviewNote[item.id] || ''}
                      onChange={(e) => setReviewNote({ ...reviewNote, [item.id]: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={isSelfAuthor || approveMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
