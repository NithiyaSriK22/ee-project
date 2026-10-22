import React, { useState } from 'react';
import { MustResolveItem, ResolutionType, ResolutionTypes } from '../types/doctor-review.types';
import { DocumentSnippetViewer } from './DocumentSnippetViewer';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Eye,
  Check,
  Edit2,
  RefreshCw,
} from 'lucide-react';

interface MustResolveCardProps {
  item: MustResolveItem;
  reviewId: string | null;
  onResolve: (itemRef: string, resolutionType: ResolutionType, correctedValue?: string, viewedSource?: boolean) => Promise<void>;
  onInspectStatement?: (sourceRef: string) => void;
}

export const MustResolveCard: React.FC<MustResolveCardProps> = ({
  item,
  reviewId,
  onResolve,
  onInspectStatement,
}) => {
  const [selectedAction, setSelectedAction] = useState<ResolutionType | ''>('');
  const [correctedValue, setCorrectedValue] = useState<string>('');
  const [showCropViewer, setShowCropViewer] = useState<boolean>(false);
  const [sourceViewed, setSourceViewed] = useState<boolean>(item.resolution?.viewedSource || false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(!item.isResolved);

  const handleApplyResolution = async () => {
    if (!selectedAction || !reviewId) return;
    if (selectedAction === ResolutionTypes.CORRECTED && !correctedValue.trim()) {
      alert('Please enter the corrected value.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onResolve(
        item.itemRef,
        selectedAction as ResolutionType,
        selectedAction === ResolutionTypes.CORRECTED ? correctedValue.trim() : undefined,
        sourceViewed
      );
      setIsEditing(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to record resolution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSource = () => {
    setSourceViewed(true);
    if (item.sourceType === 'DOCUMENT') {
      setShowCropViewer(true);
    } else if (onInspectStatement) {
      onInspectStatement(item.sourceRef);
    }
  };

  const getItemTypeBadge = () => {
    switch (item.itemType) {
      case 'DOCUMENT_FIELD':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
            <FileText className="w-3 h-3 text-red-600" /> Critical Document Field
          </span>
        );
      case 'INTERVIEW_ANSWER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
            <MessageSquare className="w-3 h-3 text-teal-600" /> Critical Interview Answer
          </span>
        );
      case 'CONFLICT_MARKER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-300">
            <ShieldAlert className="w-3 h-3 text-rose-600" /> Intake-Document Conflict
          </span>
        );
      case 'ALERT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Open Triage Alert
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all shadow-xs ${
        item.isResolved
          ? 'bg-emerald-50/30 border-emerald-200'
          : 'bg-white border-red-300 ring-2 ring-red-100'
      } p-4 mb-3`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {item.isResolved ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse flex-shrink-0" />
          )}
          <span className="font-bold text-slate-900 text-sm">{item.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {getItemTypeBadge()}
          {item.verificationState && (
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {item.verificationState}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-700 leading-relaxed mb-3">{item.description}</p>

      {/* Raw values & Source context strip */}
      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-500">
            Ref: <code className="font-mono text-slate-800">{item.sourceRef}</code>
          </span>
          {item.rawExtractedValue && (
            <span className="text-slate-600">
              Extracted: <strong className="font-mono text-slate-900">{item.rawExtractedValue}</strong>
            </span>
          )}
          {item.matchedReferenceValue && (
            <span className="text-emerald-700 font-semibold">
              Matched: <strong className="font-mono">{item.matchedReferenceValue}</strong>
            </span>
          )}
        </div>

        {/* View source button */}
        <button
          onClick={handleOpenSource}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
            sourceViewed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{sourceViewed ? 'Source Inspected' : 'Inspect Source'}</span>
        </button>
      </div>

      {/* Inline Document Snippet Crop */}
      {showCropViewer && (
        <div className="mb-3">
          <DocumentSnippetViewer
            documentId={item.sourceSnippetRef?.split(':')[0] || item.sourceRef.split(':')[0] || 'doc'}
            snippetRef={item.sourceSnippetRef || item.sourceRef}
            rawExtractedValue={item.rawExtractedValue}
            matchedReferenceValue={item.matchedReferenceValue}
            ocrConfidence={item.ocrConfidence}
            verificationState={item.verificationState}
            onClose={() => setShowCropViewer(false)}
          />
        </div>
      )}

      {/* Resolution State or Form */}
      {item.isResolved && !isEditing ? (
        <div className="flex flex-wrap items-center justify-between bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-300 text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700 font-bold" />
            <span>
              Resolved as: <strong>{item.resolution?.resolutionType}</strong>
              {item.resolution?.correctedValue && (
                <span className="ml-1 text-emerald-900 font-mono">
                  (Corrected: "{item.resolution.correctedValue}")
                </span>
              )}
            </span>
          </div>

          <button
            onClick={() => {
              setSelectedAction(item.resolution?.resolutionType || '');
              setCorrectedValue(item.resolution?.correctedValue || '');
              setIsEditing(true);
            }}
            className="flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-bold text-xs"
          >
            <Edit2 className="w-3 h-3" /> Edit Resolution
          </button>
        </div>
      ) : (
        <div className="space-y-3 bg-red-50/40 p-3 rounded-lg border border-red-200">
          <div className="text-xs font-bold text-red-950">
            Mandatory Physician Action (Select one to unblock confirmation):
          </div>

          {/* Action options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedAction(ResolutionTypes.VERIFIED_AGAINST_SOURCE)}
              className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all ${
                selectedAction === ResolutionTypes.VERIFIED_AGAINST_SOURCE
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500'
              }`}
            >
              <div className="font-bold">VERIFIED_AGAINST_SOURCE</div>
              <div className={`text-[10px] mt-0.5 ${selectedAction === ResolutionTypes.VERIFIED_AGAINST_SOURCE ? 'text-emerald-100' : 'text-slate-500'}`}>
                Checked original document or asked patient
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction(ResolutionTypes.CORRECTED)}
              className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all ${
                selectedAction === ResolutionTypes.CORRECTED
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-blue-500'
              }`}
            >
              <div className="font-bold">CORRECTED</div>
              <div className={`text-[10px] mt-0.5 ${selectedAction === ResolutionTypes.CORRECTED ? 'text-blue-100' : 'text-slate-500'}`}>
                Enter physician-corrected clinical value
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction(ResolutionTypes.MARKED_NOT_AVAILABLE)}
              className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all ${
                selectedAction === ResolutionTypes.MARKED_NOT_AVAILABLE
                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="font-bold">MARKED_NOT_AVAILABLE</div>
              <div className={`text-[10px] mt-0.5 ${selectedAction === ResolutionTypes.MARKED_NOT_AVAILABLE ? 'text-slate-200' : 'text-slate-500'}`}>
                Information unavailable or cannot be obtained
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction(ResolutionTypes.DEFER_TO_CONSULTATION)}
              className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all ${
                selectedAction === ResolutionTypes.DEFER_TO_CONSULTATION
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-amber-500'
              }`}
            >
              <div className="font-bold">DEFER_TO_CONSULTATION</div>
              <div className={`text-[10px] mt-0.5 ${selectedAction === ResolutionTypes.DEFER_TO_CONSULTATION ? 'text-amber-100' : 'text-slate-500'}`}>
                Carried into confirmed record as "to clarify"
              </div>
            </button>
          </div>

          {/* Corrected Value Input */}
          {selectedAction === ResolutionTypes.CORRECTED && (
            <div className="mt-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Enter Correct Clinical Value:
              </label>
              <input
                type="text"
                value={correctedValue}
                onChange={(e) => setCorrectedValue(e.target.value)}
                placeholder="e.g. Amoxicillin 500mg PO TID or No known drug allergy"
                className="w-full text-xs font-medium p-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {item.isResolved && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyResolution}
              disabled={!selectedAction || isSubmitting}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recording...
                </>
              ) : (
                <>
                  Record Resolution <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
