import React, { useEffect, useState, useCallback } from 'react';
import { DoctorReviewApi } from '../api/doctor-review.api';
import { apiConfig } from '../../../config/api.config';
import {
  FileText,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  FileCheck,
} from 'lucide-react';

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
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [snippetData, setSnippetData] = useState<{
    signedUrl: string;
    expiresAt: string;
    snippetCropCoordinates: { x: number; y: number; width: number; height: number };
    snippetRef: string;
    fileName: string;
    mimeType?: string;
  } | null>(null);

  const fetchSnippet = useCallback(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setImageError(false);
    setImageLoaded(false);

    DoctorReviewApi.getDocumentSnippet(documentId, snippetRef)
      .then((data) => {
        if (isMounted) {
          setSnippetData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to generate signed document preview');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentId, snippetRef]);

  useEffect(() => {
    return fetchSnippet();
  }, [fetchSnippet]);

  const getFullImageUrl = (signedUrl?: string) => {
    if (!signedUrl) return '';
    if (signedUrl.startsWith('http://') || signedUrl.startsWith('https://')) {
      return signedUrl;
    }
    const origin = (apiConfig.baseUrl || 'http://localhost:5001/api/v1').replace(/\/api\/v1\/?$/, '');
    return `${origin}${signedUrl.startsWith('/') ? '' : '/'}${signedUrl}`;
  };

  const isPdf =
    snippetData?.mimeType === 'application/pdf' ||
    snippetData?.fileName?.toLowerCase().endsWith('.pdf');

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

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

  const fullUrl = snippetData ? getFullImageUrl(snippetData.signedUrl) : '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-700" />
          <h3 className="font-bold text-slate-900 text-sm">Original Document Source</h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Visual Crop & Original Document Viewer */}
      <div className="relative rounded-lg bg-slate-900 overflow-hidden min-h-[220px] flex flex-col items-center justify-center border border-slate-300">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-300 text-xs p-8">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
            <span>Generating signed document view...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-300 space-y-3">
            <div className="flex justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <p className="font-semibold text-rose-200">{error}</p>
            <p className="text-[11px] text-slate-400">Short-lived link expired or unauthorized</p>
            <button
              onClick={fetchSnippet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs border border-slate-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
          </div>
        ) : snippetData ? (
          <div className="relative w-full h-full flex flex-col items-center p-3">
            {/* Metadata Bar & Controls */}
            <div className="w-full bg-slate-800/90 rounded p-2 mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 font-mono">
              <span className="truncate max-w-[200px] font-medium text-slate-100 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                {snippetData.fileName}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-teal-400 flex items-center gap-1">
                  <ZoomIn className="w-3 h-3" /> Region [{snippetData.snippetCropCoordinates?.x || 45},
                  {snippetData.snippetCropCoordinates?.y || 120}]
                </span>

                {/* Zoom controls for image scans */}
                {!isPdf && (
                  <div className="flex items-center gap-1 bg-slate-700/80 px-1.5 py-0.5 rounded border border-slate-600">
                    <button
                      onClick={handleZoomOut}
                      title="Zoom Out"
                      disabled={zoomLevel <= 0.75}
                      className="p-1 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] w-9 text-center font-bold text-teal-300">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      title="Zoom In"
                      disabled={zoomLevel >= 2.5}
                      className="p-1 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      title="Reset Zoom"
                      className="p-1 hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document Content: PDF vs High-Resolution Image */}
            {isPdf ? (
              <div className="w-full flex flex-col rounded border-2 border-teal-600 shadow-inner bg-slate-100 overflow-hidden">
                <div className="bg-slate-800 text-slate-200 px-3 py-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-teal-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Interactive PDF Document Preview
                  </span>
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-200 font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open PDF in New Window
                  </a>
                </div>
                <iframe
                  src={`${fullUrl}#toolbar=0&navpanes=0`}
                  title={`Original Medical PDF - ${snippetData.fileName}`}
                  className="w-full h-72 border-0 bg-white"
                />
              </div>
            ) : (
              <div className="relative w-full max-h-64 overflow-auto rounded border-2 border-teal-600 shadow-inner bg-slate-950 flex flex-col items-center justify-center p-2">
                {imageError ? (
                  <div className="p-6 text-center text-xs text-rose-300 space-y-2">
                    <AlertTriangle className="w-5 h-5 mx-auto text-rose-400" />
                    <p className="font-semibold">Direct image display restricted or unavailable</p>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open high-res file directly
                    </a>
                  </div>
                ) : (
                  <div className="relative w-full flex items-center justify-center overflow-auto min-h-[140px]">
                    {!imageLoaded && !imageError && (
                      <RefreshCw className="w-5 h-5 animate-spin text-teal-400 absolute" />
                    )}
                    <img
                      src={fullUrl}
                      alt={snippetData.fileName || 'Original Document'}
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out',
                      }}
                      className={`max-h-56 w-auto object-contain select-none transition-transform ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Extracted segment focus */}
            <div className="w-full mt-2 p-2.5 bg-amber-50 text-slate-800 font-mono text-xs rounded border border-amber-300">
              <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider mb-0.5">
                Extracted Segment Focus [{snippetRef || snippetData.snippetRef}]
              </div>
              <div className="p-1.5 bg-white rounded border border-slate-200 font-mono text-xs text-slate-700 break-all">
                {rawExtractedValue || 'Original scanned crop segment'}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions Strip: Full Document Inspection */}
      {snippetData && (
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-xs text-slate-600 font-medium">Inspect high-resolution full scan:</span>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Original {isPdf ? 'PDF' : 'File'}</span>
          </a>
        </div>
      )}

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
