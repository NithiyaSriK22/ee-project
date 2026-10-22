import React, { useEffect, useState } from 'react';
import { WorkspaceStatementItem, StatementSourceDetail } from '../types/doctor-review.types';
import { DoctorReviewApi } from '../api/doctor-review.api';
import { DocumentSnippetViewer } from './DocumentSnippetViewer';
import {
  FileText,
  MessageSquare,
  Cpu,
  Edit3,
  PlusCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ProvenancePanelProps {
  selectedStatement: WorkspaceStatementItem | null;
  onClose?: () => void;
  onSourceViewed?: (sourceRef: string) => void;
}

export const ProvenancePanel: React.FC<ProvenancePanelProps> = ({
  selectedStatement,
  onClose,
  onSourceViewed,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [sourceDetail, setSourceDetail] = useState<StatementSourceDetail | null>(null);
  const [activeSnippetDoc, setActiveSnippetDoc] = useState<{
    documentId: string;
    snippetRef?: string;
    rawExtractedValue?: string | null;
    matchedReferenceValue?: string | null;
    ocrConfidence?: number | null;
    verificationState?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!selectedStatement) {
      setSourceDetail(null);
      setActiveSnippetDoc(null);
      return;
    }

    setLoading(true);
    DoctorReviewApi.getStatementSources(selectedStatement.id)
      .then((data) => {
        setSourceDetail(data);
        if (data.sources.length > 0 && onSourceViewed) {
          onSourceViewed(data.sources[0].sourceRef);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch detailed statement provenance:', err?.message);
        // Fallback to sources already on statement
        setSourceDetail({
          statementId: selectedStatement.id,
          sources: selectedStatement.sources.map((s) => ({
            sourceType: s.sourceType as any,
            sourceRef: s.sourceRef,
          })),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedStatement?.id]);

  if (!selectedStatement) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 border border-slate-200 rounded-xl">
        <Sparkles className="w-8 h-8 text-slate-400 mb-2" />
        <h4 className="text-sm font-bold text-slate-700">Clinical Provenance Inspector</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Click any statement or resolution item in the draft summary to inspect grounded interview answers, OCR crops, and confidence scores.
        </p>
      </div>
    );
  }

  const getOriginBadge = (origin: string) => {
    switch (origin) {
      case 'AI_CONFIRMED_UNCHANGED':
      case 'MODEL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Cpu className="w-3.5 h-3.5" /> AI-Phrased Draft
          </span>
        );
      case 'PATIENT_QUOTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <MessageSquare className="w-3.5 h-3.5" /> Patient Quote
          </span>
        );
      case 'DOCTOR_EDITED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Edit3 className="w-3.5 h-3.5" /> Doctor Edited
          </span>
        );
      case 'DOCTOR_ADDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <PlusCircle className="w-3.5 h-3.5" /> Doctor Added
          </span>
        );
      case 'CODE_TEMPLATE':
      case 'CODE_PLACEHOLDER_RESOLVED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <HelpCircle className="w-3.5 h-3.5" /> Auto-Inserted Placeholder
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 text-slate-800 flex flex-col h-full overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" /> Statement Provenance & Grounding
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Section: {selectedStatement.section.replace(/_/g, ' ')}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded border border-slate-200"
          >
            ✕
          </button>
        )}
      </div>

      {/* Origin Banner */}
      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <span className="text-xs font-medium text-slate-600">Statement Origin:</span>
        {getOriginBadge(selectedStatement.origin)}
      </div>

      {/* Current Statement Text */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs leading-relaxed">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Review Workspace Text
        </span>
        <p className="font-medium text-slate-900">{selectedStatement.text}</p>
        {selectedStatement.originalDraftText && selectedStatement.isEdited && (
          <div className="mt-2 pt-2 border-t border-slate-200 text-slate-500 italic">
            <span className="text-[10px] font-bold uppercase not-italic text-slate-400 block">
              Original AI Draft Text:
            </span>
            "{selectedStatement.originalDraftText}"
          </div>
        )}
      </div>

      {/* Inline Document Crop Viewer if opened */}
      {activeSnippetDoc && (
        <DocumentSnippetViewer
          documentId={activeSnippetDoc.documentId}
          snippetRef={activeSnippetDoc.snippetRef}
          rawExtractedValue={activeSnippetDoc.rawExtractedValue}
          matchedReferenceValue={activeSnippetDoc.matchedReferenceValue}
          ocrConfidence={activeSnippetDoc.ocrConfidence}
          verificationState={activeSnippetDoc.verificationState}
          onClose={() => setActiveSnippetDoc(null)}
        />
      )}

      {/* Sources List */}
      <div className="space-y-3 flex-1">
        <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
          <span>Grounded Source Citations</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {selectedStatement.sources.length} reference{selectedStatement.sources.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-6 text-slate-400 gap-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
            <span>Retrieving verified source records...</span>
          </div>
        ) : sourceDetail && sourceDetail.sources.length > 0 ? (
          <div className="space-y-2.5">
            {sourceDetail.sources.map((src, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:border-red-200 transition-colors text-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
                    {src.sourceType === 'DOCUMENT' ? (
                      <FileText className="w-3 h-3 text-red-600" />
                    ) : (
                      <MessageSquare className="w-3 h-3 text-teal-600" />
                    )}
                    {src.sourceType}: {src.sourceRef}
                  </span>

                  {src.sourceType === 'DOCUMENT' && (
                    <button
                      onClick={() => {
                        setActiveSnippetDoc({
                          documentId: src.documentDetails?.documentId || src.sourceRef.split(':')[0] || 'doc_ref',
                          snippetRef: src.documentDetails?.snippetRef || src.sourceRef,
                          rawExtractedValue: src.documentDetails?.rawExtractedValue,
                          matchedReferenceValue: src.documentDetails?.matchedReferenceValue,
                          ocrConfidence: src.documentDetails?.ocrConfidence,
                          verificationState: src.documentDetails?.verificationState,
                        });
                        if (onSourceViewed) onSourceViewed(src.sourceRef);
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-bold text-red-700 hover:bg-red-50 border border-red-300 transition-colors"
                    >
                      View Crop
                    </button>
                  )}
                </div>

                {src.interviewDetails && (
                  <div className="space-y-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Question Prompt</span>
                      <p className="font-medium text-slate-800">{src.interviewDetails.questionPrompt}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient Answer</span>
                      <p className="font-bold text-teal-900 font-mono">
                        {typeof src.interviewDetails.answerValue === 'object'
                          ? JSON.stringify(src.interviewDetails.answerValue)
                          : String(src.interviewDetails.answerValue)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500">
                      <span>Via: <strong className="text-slate-700">{src.interviewDetails.answeredVia}</strong></span>
                      {src.interviewDetails.languageUsed && (
                        <span>Lang: <strong className="text-slate-700">{src.interviewDetails.languageUsed}</strong></span>
                      )}
                    </div>
                  </div>
                )}

                {src.documentDetails && (
                  <div className="space-y-1 bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Doc: {src.documentDetails.fileName}</span>
                      <span className="text-emerald-700 font-bold">
                        {src.documentDetails.verificationState || 'VERIFIED'}
                      </span>
                    </div>
                    {src.documentDetails.matchedReferenceValue && (
                      <div className="text-slate-800 font-bold">
                        Formulary: {src.documentDetails.matchedReferenceValue}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
            No specific source citation attached to this statement (Doctor Added or Fallback).
          </div>
        )}
      </div>
    </div>
  );
};
