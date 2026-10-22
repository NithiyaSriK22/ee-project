import React, { useEffect, useState } from 'react';
import { DoctorReviewApi } from '../api/doctor-review.api';
import { FileText, ShieldCheck, HelpCircle, AlertTriangle, ExternalLink, RefreshCw, ZoomIn } from 'lucide-react';

interface DocumentSnippetViewerProps {
  documentId: string;
  snippetRef?: string;
  rawExtractedValue?: string | null;
  matchedReferenceValue?: string | null;
  ocrConfidence?: number | null;
  verificationState?: string | null;
  onClose?: () => void;
}

export const DocumentSnippetViewer: React.FC<DocumentSnippetViewerProps> = ({
  documentId,
  snippetRef,
  rawExtractedValue,
  matchedReferenceValue,
  ocrConfidence,
  verificationState,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snippetData, setSnippetData] = useState<{
    signedUrl: string;
    expiresAt: string;
    snippetCropCoordinates: { x: number; y: number; width: number; height: number };
    snippetRef: string;
    fileName: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    DoctorReviewApi.getDocumentSnippet(documentId, snippetRef)
      .then((data) => {
        if (isMounted) {
          setSnippetData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to generate signed document crop preview');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentId, snippetRef]);

  const getStatusBadge = () => {
    switch (verificationState) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> VERIFIED
          </span>
        );
      case 'MISMATCH_FLAGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> MISMATCH FLAGGED
          </span>
        );
      case 'UNREADABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <HelpCircle className="w-3.5 h-3.5 text-rose-600" /> UNREADABLE
          </span>
        );
      case 'UNVERIFIED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> UNVERIFIED
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-600" />
          <h3 className="font-bold text-slate-900 text-sm">Document Snippet Source</h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded border border-slate-200"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Visual Crop Viewer */}
      <div className="relative rounded-lg bg-slate-900 overflow-hidden min-h-[160px] flex items-center justify-center border border-slate-300">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-300 text-xs p-6">
            <RefreshCw className="w-5 h-5 animate-spin text-red-400" />
            <span>Generating signed optical crop...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-xs text-rose-300">
            <p className="font-semibold">{error}</p>
            <p className="text-[11px] text-slate-400 mt-1">Short-lived link expired or unauthorized</p>
          </div>
        ) : snippetData ? (
          <div className="relative w-full h-full flex flex-col items-center p-3">
            <div className="w-full bg-slate-800/90 rounded p-2 mb-2 flex items-center justify-between text-[11px] text-slate-300 font-mono">
              <span>{snippetData.fileName}</span>
              <span className="text-amber-400 flex items-center gap-1">
                <ZoomIn className="w-3 h-3" /> Region [{snippetData.snippetCropCoordinates.x},{snippetData.snippetCropCoordinates.y}]
              </span>
            </div>
            {/* Visual crop bounding container */}
            <div className="relative max-h-48 overflow-hidden rounded border-2 border-red-500 shadow-inner bg-white">
              <img
                src={snippetData.signedUrl}
                alt="Document Crop Snippet"
                className="max-h-48 object-contain"
                onError={(e) => {
                  // Fallback simulation for offline/test environments
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="p-3 bg-amber-50 text-slate-800 font-mono text-xs border border-dashed border-amber-300">
                <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">
                  Optical OCR Crop Highlight [{snippetRef || snippetData.snippetRef}]
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 font-mono text-xs">
                  {rawExtractedValue || 'Original scanned crop segment'}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Extracted Values & Confidence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 font-medium block mb-1">Raw Extracted Text (OCR)</span>
          <span className="font-mono text-slate-900 font-bold break-all">
            {rawExtractedValue || '—'}
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 font-medium block mb-1">Formulary Matched Value</span>
          <span className="font-mono text-emerald-800 font-bold break-all">
            {matchedReferenceValue || 'No formulary match'}
          </span>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div>
          <span>Confidence: </span>
          <span className="font-bold font-mono text-slate-800">
            {ocrConfidence !== undefined && ocrConfidence !== null
              ? `${Math.round(ocrConfidence * 100)}%`
              : 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <ExternalLink className="w-3 h-3" />
          <span>Signed short-lived URL (Expires in 15m)</span>
        </div>
      </div>
    </div>
  );
};
