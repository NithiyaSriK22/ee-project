import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../api/documents.api';
import {
  DocumentType,
  DocumentTypes,
  UploadedDocumentItem,
  DocumentUploadResponse,
} from '../types/documents.types';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { DocumentCaptureScreen } from '../components/DocumentCaptureScreen';
import { CapturePreview } from '../components/CapturePreview';
import { UploadProgress } from '../components/UploadProgress';
import { DocumentScanErrorState } from '../components/DocumentScanErrorState';
import {
  FileText,
  CheckCircle2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
} from 'lucide-react';

export const DocumentScanPage: React.FC = () => {
  const navigate = useNavigate();

  // Camera & Capture Hook
  const {
    videoRef,
    isStreaming,
    capturedImage,
    cameraError,
    startCamera,
    capturePhoto,
    retakePhoto,
    setManualImage,
  } = useCameraCapture();

  // State
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>(DocumentTypes.PRESCRIPTION);
  const [activeStage, setActiveStage] = useState<'IDLE' | 'PREVIEW' | 'UPLOADING' | 'ERROR' | 'SUCCESS'>('IDLE');
  const [uploadStage, setUploadStage] = useState<'UPLOADING' | 'OCR_EXTRACTING' | 'VALIDATING' | 'COMPLETE'>('UPLOADING');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadedResult, setLastUploadedResult] = useState<DocumentUploadResponse | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocumentItem[]>([]);

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

  // When image is captured
  const handleCapture = () => {
    const dataUrl = capturePhoto();
    if (dataUrl) {
      setActiveStage('PREVIEW');
    }
  };

  const handleFileUpload = (base64: string, _fileName: string, mimeType: string) => {
    const fullDataUrl = `data:${mimeType};base64,${base64}`;
    setManualImage(fullDataUrl);
    setActiveStage('PREVIEW');
  };

  const handleConfirmUpload = async () => {
    if (!capturedImage) return;

    setActiveStage('UPLOADING');
    setUploadStage('UPLOADING');
    setUploadError(null);

    // Extract base64 without prefix
    const base64Content = capturedImage.includes(',')
      ? capturedImage.split(',')[1]!
      : capturedImage;

    try {
      // Simulate progress progression for smooth patient UX
      setTimeout(() => setUploadStage('OCR_EXTRACTING'), 600);
      setTimeout(() => setUploadStage('VALIDATING'), 1200);

      const result = await documentsApi.uploadDocument({
        fileBase64: base64Content,
        fileName: `${selectedDocType.toLowerCase()}_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        documentType: selectedDocType,
      });

      setUploadStage('COMPLETE');
      setLastUploadedResult(result);

      await loadDocuments();

      if (result.ocrResult.success === false) {
        setUploadError(result.ocrResult.errorMessage || 'OCR extraction failed on document image.');
        setActiveStage('ERROR');
      } else {
        setActiveStage('SUCCESS');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document. Please check connection and try again.');
      setActiveStage('ERROR');
    }
  };

  const handleScanAnother = () => {
    retakePhoto();
    setActiveStage('IDLE');
    setLastUploadedResult(null);
  };

  const handleProceedToInterview = () => {
    navigate('/interview');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Prescription & Lab Document Digitizer</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Scan Your Past Medical Papers
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Digitize past prescriptions or lab results to save consultation time with the physician.
            </p>
          </div>

          <button
            type="button"
            onClick={handleProceedToInterview}
            className="self-start sm:self-center px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-bold text-sm shadow-lg flex items-center gap-2 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <span>Skip or Continue to Interview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Scan Workflow State */}
        {activeStage === 'UPLOADING' && (
          <UploadProgress stage={uploadStage} />
        )}

        {activeStage === 'ERROR' && (
          <DocumentScanErrorState
            errorMessage={uploadError || undefined}
            onRetry={handleScanAnother}
            onSkipOrStaffHelp={handleProceedToInterview}
          />
        )}

        {activeStage === 'PREVIEW' && capturedImage && (
          <CapturePreview
            imageSrc={capturedImage}
            documentType={selectedDocType}
            isUploading={false}
            onRetake={() => {
              retakePhoto();
              setActiveStage('IDLE');
            }}
            onConfirmUpload={handleConfirmUpload}
          />
        )}

        {activeStage === 'SUCCESS' && lastUploadedResult && (
          <div className="w-full max-w-2xl mx-auto p-8 bg-slate-900 border border-teal-500/40 rounded-3xl text-center shadow-2xl space-y-6 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-teal-500/10 border-2 border-teal-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-teal-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Prescription Digitized & Verified</h2>
              <p className="text-sm text-slate-300">
                {lastUploadedResult.validationSummary?.structuredExplanation.summaryText ||
                  'Medicines and dosages were extracted and checked against the National Formulary.'}
              </p>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs text-slate-300 space-y-2 text-left">
              <div className="flex items-center justify-between font-bold text-teal-300 border-b border-slate-700 pb-2">
                <span>Validation Summary:</span>
                <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700">
                  {lastUploadedResult.document.overallStatus}
                </span>
              </div>
              <p className="text-slate-300">
                Extracted medicines will appear in the physician's summary review.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleScanAnother}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-teal-400" />
                <span>Scan Another Paper</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToInterview}
                className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-extrabold text-base shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span>Proceed to Guided Interview</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {activeStage === 'IDLE' && (
          <DocumentCaptureScreen
            videoRef={videoRef}
            isStreaming={isStreaming}
            cameraError={cameraError}
            selectedDocType={selectedDocType}
            onSelectDocType={setSelectedDocType}
            onStartCamera={startCamera}
            onCapture={handleCapture}
            onFileUpload={handleFileUpload}
          />
        )}

        {/* Existing Uploaded Documents for this visit */}
        {uploadedDocuments.length > 0 && activeStage === 'IDLE' && (
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  Scanned Documents for this Visit ({uploadedDocuments.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Encrypted & Session-Isolated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uploadedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="text-xs font-bold text-white">{doc.documentType}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">{doc.fileName}</p>
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      doc.overallStatus === 'FULLY_VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : doc.overallStatus === 'NEEDS_PHYSICIAN_REVIEW'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    }`}
                  >
                    {doc.overallStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-3 text-center text-xs text-slate-500 mt-8">
        THUNAI • Deterministic Document Digitization & Validation Gate
      </footer>
    </div>
  );
};
