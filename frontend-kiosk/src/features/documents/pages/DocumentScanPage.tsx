import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../api/documents.api';
import {
  DocumentType,
  DocumentTypes,
  DocumentTypeLabels,
  UploadedDocumentItem,
  DocumentUploadResponse,
} from '../types/documents.types';
import { useCameraCapture } from '../hooks/useCameraCapture';
import {
  FileText,
  Plus,
  ArrowRight,
  ShieldCheck,
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  X,
  FileCheck,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface QueuedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  previewUrl: string | null;
  documentType: DocumentType;
}

export const DocumentScanPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera & Capture Hook
  const {
    videoRef,
    isStreaming,
    cameraError,
    startCamera,
    capturePhoto,
    retakePhoto,
  } = useCameraCapture();

  // Mode: 'SCAN' (Camera) or 'UPLOAD' (File selection)
  const [activeTab, setActiveTab] = useState<'SCAN' | 'UPLOAD'>('SCAN');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>(DocumentTypes.PRESCRIPTION);

  // Multi-file upload queue
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [patientConfirmed, setPatientConfirmed] = useState<boolean>(true);

  // Processing & progress states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(0);
  const [processingStatusText, setProcessingStatusText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Uploaded documents history for active visit
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocumentItem[]>([]);
  const [expandedDocSummaryId, setExpandedDocSummaryId] = useState<string | null>(null);

  // Load existing documents for visit
  const loadDocuments = async () => {
    try {
      const docs = await documentsApi.listVisitDocuments();
      setUploadedDocuments(docs);
    } catch (e) {
      console.error('Failed to load visit documents:', e);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Format file size nicely (KB / MB)
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle Photo Capture from Camera
  const handleCapturePhoto = () => {
    const dataUrl = capturePhoto();
    if (dataUrl) {
      const base64 = dataUrl.split(',')[1] || dataUrl;
      const newFile: QueuedFile = {
        id: crypto.randomUUID(),
        name: `camera_scan_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: Math.round((base64.length * 3) / 4),
        base64,
        previewUrl: dataUrl,
        documentType: selectedDocType,
      };
      setFileQueue((prev) => [...prev, newFile]);
      retakePhoto();
    }
  };

  // Handle Multiple File Selection from Device
  const handleMultipleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    Array.from(files).forEach((file) => {
      // Validate file size (15MB limit)
      if (file.size > 15 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 15 MB limit and was skipped.`);
        return;
      }
      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
        alert(`File "${file.name}" has an unsupported format. Supported formats: PDF, JPEG, PNG, WEBP.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const queued: QueuedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
          size: file.size,
          base64,
          previewUrl: isPdf ? null : result,
          documentType: selectedDocType,
        };
        setFileQueue((prev) => [...prev, queued]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input value to allow re-selecting same file if desired
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFromQueue = (id: string) => {
    setFileQueue((prev) => prev.filter((f) => f.id !== id));
  };

  // Execute upload of all queued files sequentially
  const handleSubmitQueue = async () => {
    if (fileQueue.length === 0) return;
    if (!patientConfirmed) {
      alert('Please confirm the document verification statement before uploading.');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      setCurrentProcessingIndex(i + 1);
      setProcessingStatusText(`Uploading "${item.name}" (${i + 1} of ${fileQueue.length})...`);

      try {
        setProcessingStatusText(`Running OCR & Validating "${item.name}"...`);
        const result: DocumentUploadResponse = await documentsApi.uploadDocument({
          fileBase64: item.base64,
          fileName: item.name,
          mimeType: item.type,
          documentType: item.documentType,
        });

        if (result.ocrResult?.success === false) {
          console.warn(`OCR warning on ${item.name}:`, result.ocrResult.errorMessage);
        }
      } catch (err: any) {
        console.error(`Failed uploading ${item.name}:`, err);
        setUploadError(`Error processing "${item.name}": ${err?.message || 'Server error'}`);
      }
    }

    setIsProcessing(false);
    setFileQueue([]);
    setProcessingStatusText('All records processed successfully.');
    await loadDocuments();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Medical Document Upload & AI Summarizer</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Upload Your Medical Records
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Scan or upload your medical reports, prescriptions, laboratory results, and other medical documents so your healthcare team can review them.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/interview')}
            className="self-start sm:self-center px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-bold text-sm shadow-lg flex items-center gap-2 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <span>Skip or Continue to Interview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-3 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('SCAN')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'SCAN'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Option A: Scan Document</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('UPLOAD')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'UPLOAD'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Option B: Upload Document</span>
          </button>
        </div>

        {/* Document Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Select Document Category:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(DocumentTypes) as DocumentType[]).map((typeKey) => {
              const meta = DocumentTypeLabels[typeKey];
              const isSelected = selectedDocType === typeKey;
              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setSelectedDocType(typeKey)}
                  className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-teal-500/20 border-teal-400 text-white ring-2 ring-teal-500/30'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm font-bold">{meta.label}</span>
                  <span className="text-[11px] text-slate-400 line-clamp-1">{meta.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Option A: Camera Scan Viewfinder */}
        {activeTab === 'SCAN' && (
          <div className="relative w-full max-w-2xl mx-auto aspect-[4/3] bg-slate-900 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
            {isStreaming ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-8 border-2 border-dashed border-teal-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-4 shadow-inner">
                  <div className="flex justify-between text-teal-300 text-xs font-bold tracking-wider uppercase">
                    <span>Align Prescription</span>
                    <span>Hold Steady</span>
                  </div>
                  <div className="text-center text-xs text-teal-200 bg-slate-950/80 py-1.5 px-4 rounded-full mx-auto backdrop-blur-xs">
                    Keep document flat inside the dashed border
                  </div>
                  <div className="flex justify-between text-teal-300 text-xs font-bold tracking-wider uppercase">
                    <span>Good Lighting</span>
                    <span>Ready</span>
                  </div>
                </div>

                <div className="absolute bottom-5 inset-x-0 flex justify-center">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="py-3 px-8 rounded-full bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all ring-4 ring-teal-400/40"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Capture Page Photo</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 shadow-inner">
                  <Camera className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Scan Medical Papers with Camera</h3>
                  <p className="text-sm text-slate-300 max-w-md">
                    Position your medical document flat under the kiosk camera. You can capture multiple pages before submitting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="py-3 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Turn On Camera</span>
                </button>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-4 bg-slate-950/95 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <h4 className="text-base font-bold text-white">Camera Notice</h4>
                <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('UPLOAD')}
                    className="py-2 px-4 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold"
                  >
                    Switch to File Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Option B: Multi-File Upload Box */}
        {activeTab === 'UPLOAD' && (
          <div className="w-full max-w-2xl mx-auto p-8 bg-slate-900 border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-3xl text-center space-y-4 transition-all">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleMultipleFileSelect}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-teal-400">
              <Upload className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Select One or More Medical Files</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Supported formats: <strong>PDF, JPEG, PNG, WEBP</strong>. Up to 15 MB per document. Multiple documents will be processed and consolidated into a combined clinical summary.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Choose Files from Device</span>
            </button>
          </div>
        )}

        {/* Selected Files Queue to Upload */}
        {fileQueue.length > 0 && (
          <div className="w-full bg-slate-900 border border-teal-500/40 rounded-3xl p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  Ready to Upload ({fileQueue.length} document{fileQueue.length > 1 ? 's' : ''})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFileQueue([])}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear Queue
              </button>
            </div>

            {/* List of Queued Files */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {fileQueue.map((file) => (
                <div
                  key={file.id}
                  className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0 bg-slate-950"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-teal-950/80 border border-teal-700/60 flex items-center justify-center text-teal-300 font-mono font-bold text-[11px] shrink-0">
                        PDF
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate max-w-xs">{file.name}</p>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-700 text-teal-300 font-mono">
                          {file.documentType}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveFromQueue(file.id)}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Remove from queue"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Confirmation Statement Checkbox */}
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patientConfirmed}
                  onChange={(e) => setPatientConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 focus:ring-offset-slate-900 border-slate-700 cursor-pointer"
                />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-white">
                    I confirm that these are the medical documents I want to share with my healthcare team.
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    AI-generated summaries are intended to assist the doctor during triage and consultation and do not replace professional medical review.
                  </p>
                </div>
              </label>
            </div>

            {/* Upload Button & In-Flight Status */}
            {isProcessing ? (
              <div className="p-4 bg-teal-950/60 border border-teal-500/40 rounded-2xl text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-teal-300 font-bold text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                  <span>{processingStatusText}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-400 h-2 transition-all duration-300"
                    style={{ width: `${(currentProcessingIndex / fileQueue.length) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmitQueue}
                disabled={!patientConfirmed}
                className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  patientConfirmed
                    ? 'bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 shadow-xl shadow-teal-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Upload & Generate AI Summaries ({fileQueue.length})</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {uploadError && (
              <div className="p-3 bg-rose-950/60 border border-rose-600/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Existing Uploaded Documents for Active Visit */}
        {uploadedDocuments.length > 0 && (
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  Uploaded Medical Records for this Visit ({uploadedDocuments.length})
                </h3>
              </div>
              <span className="text-xs text-teal-400 font-mono font-medium">
                OCR & AI Extraction Complete
              </span>
            </div>

            <div className="space-y-3">
              {uploadedDocuments.map((doc) => {
                const isExpanded = expandedDocSummaryId === doc.id;
                const hasSummary = !!(doc as any).summary;
                const sum = (doc as any).summary;

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 text-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate max-w-sm">{doc.fileName}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-200">
                              {doc.documentType}
                            </span>
                            <span>•</span>
                            <span>Uploaded {new Date(doc.uploadedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            doc.ocrStatus === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-rose-950 text-rose-300 border border-rose-700'
                          }`}
                        >
                          OCR: {doc.ocrStatus}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            doc.overallStatus === 'FULLY_VERIFIED'
                              ? 'bg-teal-950 text-teal-300 border border-teal-700'
                              : doc.overallStatus === 'EXTRACTION_FAILED'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-blue-950 text-blue-300 border border-blue-700'
                          }`}
                        >
                          {doc.overallStatus}
                        </span>

                        {hasSummary && (
                          <button
                            type="button"
                            onClick={() => setExpandedDocSummaryId(isExpanded ? null : doc.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-teal-400" />
                            <span>{isExpanded ? 'Hide Summary' : 'View AI Summary'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Individual Document AI Summary Card */}
                    {isExpanded && sum && (
                      <div className="p-4 rounded-xl bg-slate-900 border border-teal-500/30 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px]">
                          <span className="font-bold text-teal-300">
                            {sum.reportOrTestName || 'Extracted Clinical Report'}
                          </span>
                          <span className="text-slate-400 font-mono">Date: {sum.documentDate || 'Not specified'}</span>
                        </div>

                        {sum.importantFindings && sum.importantFindings.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-300 block mb-1">Key Findings:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                              {sum.importantFindings.map((f: string, idx: number) => (
                                <li key={idx}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {sum.medications && sum.medications.length > 0 && (
                          <div>
                            <span className="font-semibold text-teal-300 block mb-1">Prescribed Medicines:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {sum.medications.map((m: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-teal-950 text-teal-200 border border-teal-800 font-mono text-[11px]"
                                >
                                  {m.name} {m.dosage ? `(${m.dosage})` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {sum.missingOrUnreadableInfo && sum.missingOrUnreadableInfo.length > 0 && (
                          <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px]">
                            <span className="font-semibold">Notice: </span>
                            {sum.missingOrUnreadableInfo.join(' ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
