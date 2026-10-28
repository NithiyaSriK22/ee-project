import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sun,
  Download,
  AlertCircle,
  Calendar,
  ShieldCheck,
  CheckCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface MedicalImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    fileName: string;
    documentType: string;
    mimeType?: string;
    fileSizeBytes?: number;
    uploadedAt?: string;
    scanDate?: string | null;
    scanType?: string | null;
    doctorNotes?: string | null;
    overallStatus?: string;
    ocrStatus?: string;
  } | null;
}

export const MedicalImageViewerModal: React.FC<MedicalImageViewerModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [inverted, setInverted] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Reset transforms whenever opened or document changes
  useEffect(() => {
    if (isOpen && doc) {
      setScale(1);
      setRotation(0);
      setInverted(false);
      setPosition({ x: 0, y: 0 });
      fetchDocumentBlob(doc.id);
    } else {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
      }
    }
  }, [isOpen, doc?.id]);

  const fetchDocumentBlob = async (documentId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/doctor/documents/${documentId}/file`, {
        responseType: 'blob',
      });

      const contentType = String(response.headers['content-type'] || 'image/jpeg');
      const blob = new Blob([response.data], {
        type: contentType,
      });
      const objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);
    } catch (err: any) {
      console.error('Failed to load original image stream:', err);
      setError(err?.response?.data?.message || err?.message || 'Access denied or failed to stream medical image.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!doc) return;
    try {
      setDownloading(true);
      const response = await apiClient.get(`/doctor/documents/${doc.id}/file`, {
        responseType: 'blob',
      });
      const downloadType = String(response.headers['content-type'] || 'application/octet-stream');
      const blob = new Blob([response.data], {
        type: downloadType,
      });
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.fileName || `medical_imaging_${doc.id}.jpg`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err: any) {
      alert(`Download failed: ${err?.message || 'Could not download original file'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleToggleInvert = () => setInverted((inv) => !inv);

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  if (!isOpen || !doc) return null;

  const isPdf = doc.mimeType?.includes('pdf') || doc.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <Eye className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base truncate max-w-md">
                  {doc.fileName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/40">
                  {doc.scanType || doc.documentType}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Medical Imaging Inspection • Full Resolution Diagnostic Stream
              </p>
            </div>
          </div>

          {/* Interactive Toolbar Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isPdf && (
              <>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700"
                  title="Zoom In (+25%)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700"
                  title="Zoom Out (-25%)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer border border-slate-700"
                  title="Reset to 100%"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleInvert}
                  className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                    inverted
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title="Invert Contrast (Radiology Bone/Tissue Enhancement)"
                >
                  <Sun className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download original file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{downloading ? 'Downloading...' : 'Download File'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700 ml-1"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport & Info Drawer Split */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Main Visual Display Canvas */}
          <div
            className="flex-1 bg-black flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {loading && (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                <span className="text-xs font-semibold">Streaming high-resolution medical scan...</span>
              </div>
            )}

            {error && (
              <div className="p-6 max-w-md bg-rose-950/60 border border-rose-800 rounded-2xl text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <h4 className="text-white font-bold text-sm">Unable to Stream Medical Image</h4>
                <p className="text-xs text-rose-200">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchDocumentBlob(doc.id)}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  Retry Loading
                </button>
              </div>
            )}

            {!loading && !error && imageUrl && (
              isPdf ? (
                <iframe
                  src={imageUrl}
                  title="Medical PDF Report"
                  className="w-full h-full border-none"
                />
              ) : (
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                    filter: inverted ? 'invert(100%) contrast(120%)' : 'none',
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                  }}
                  className="flex items-center justify-center max-w-full max-h-full"
                >
                  <img
                    src={imageUrl}
                    alt={doc.fileName}
                    className="max-h-[80vh] max-w-[85vw] object-contain shadow-2xl pointer-events-none rounded-lg"
                  />
                </div>
              )
            )}

            {/* Invert contrast active indicator */}
            {inverted && (
              <div className="absolute bottom-4 left-4 bg-amber-500/90 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md backdrop-blur-xs">
                Contrast Inversion Active
              </div>
            )}
          </div>

          {/* Clinical Metadata & Physician Notes Sidebar */}
          <div className="w-full lg:w-80 bg-slate-950/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 overflow-y-auto space-y-4 shrink-0 text-xs">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-400 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Diagnostic Imaging Record</span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">Study Details</h4>
            </div>

            {/* Document Attributes */}
            <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Document Category</span>
                <span className="font-semibold text-slate-100">{doc.documentType}</span>
              </div>

              {doc.scanType && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Modality / Scan Type</span>
                  <span className="font-semibold text-teal-300">{doc.scanType}</span>
                </div>
              )}

              {doc.scanDate && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Scan / Examination Date</span>
                  <span className="font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {doc.scanDate}
                  </span>
                </div>
              )}

              <div>
                <span className="text-slate-400 block text-[11px]">Uploaded to MEDBRIEF</span>
                <span className="font-semibold text-slate-100">
                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Recent intake'}
                </span>
              </div>

              {doc.fileSizeBytes && (
                <div>
                  <span className="text-slate-400 block text-[11px]">File Size</span>
                  <span className="font-mono text-slate-300">
                    {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}
            </div>

            {/* Review Status Banner */}
            <div className="p-3 bg-teal-950/50 border border-teal-800/80 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                <span>Physician Review Mode</span>
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Raw study preserved for human diagnostic review. Ordinary text OCR pipeline and hallucinated diagnostic summaries are bypassed.
              </p>
            </div>

            {/* Notes for Doctor */}
            {doc.doctorNotes ? (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                  Patient / Attendant Notes:
                </span>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs italic leading-relaxed">
                  "{doc.doctorNotes}"
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                No patient notes provided for this imaging study.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
