import React, { useRef } from 'react';
import { Camera, Upload, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { DocumentType, DocumentTypes, DocumentTypeLabels } from '../types/documents.types';

interface DocumentCaptureScreenProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  cameraError: string | null;
  selectedDocType: DocumentType;
  onSelectDocType: (type: DocumentType) => void;
  onStartCamera: () => void;
  onCapture: () => void;
  onFileUpload: (base64: string, fileName: string, mimeType: string) => void;
}

export const DocumentCaptureScreen: React.FC<DocumentCaptureScreenProps> = ({
  videoRef,
  isStreaming,
  cameraError,
  selectedDocType,
  onSelectDocType,
  onStartCamera,
  onCapture,
  onFileUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract pure base64 part
      const base64Data = result.split(',')[1] || result;
      onFileUpload(base64Data, file.name, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fadeIn">
      {/* Document Type Selector */}
      <div className="w-full space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block text-center">
          Select Document Type to Scan:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(DocumentTypes) as DocumentType[]).map((typeKey) => {
            const meta = DocumentTypeLabels[typeKey];
            const isSelected = selectedDocType === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => onSelectDocType(typeKey)}
                className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col gap-1.5 ${
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

      {/* Camera Viewfinder Box with Framing Guide */}
      <div className="relative w-full max-w-2xl aspect-[4/3] bg-slate-900 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
        {isStreaming ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Document Alignment Frame Overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-teal-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-4 shadow-inner">
              <div className="flex justify-between text-teal-300 text-xs font-bold tracking-wider uppercase">
                <span>Align Top</span>
                <span>Document Frame</span>
              </div>
              <div className="text-center text-xs text-teal-200 bg-slate-950/70 py-1.5 px-4 rounded-full mx-auto backdrop-blur-xs">
                Hold prescription steady inside the dashed border
              </div>
              <div className="flex justify-between text-teal-300 text-xs font-bold tracking-wider uppercase">
                <span>Bottom Edge</span>
                <span>Good Lighting</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 shadow-inner">
              <Camera className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Position Your Document</h3>
              <p className="text-sm text-slate-300 max-w-md">
                Place your past prescription or report flat on the scanner tray under the camera.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartCamera}
              className="py-3 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Turn On Kiosk Camera</span>
            </button>
          </div>
        )}

        {/* Camera Error Overlay */}
        {cameraError && (
          <div className="absolute inset-4 bg-slate-950/90 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <h4 className="text-base font-bold text-white">Camera Notice</h4>
            <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
            <button
              type="button"
              onClick={onStartCamera}
              className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>

      {/* Capture Actions */}
      <div className="w-full max-w-xl flex flex-col sm:flex-row items-center justify-center gap-4">
        {isStreaming && (
          <button
            type="button"
            onClick={onCapture}
            className="w-full sm:w-auto flex-1 py-4 px-8 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-extrabold text-lg shadow-xl shadow-teal-500/20 ring-4 ring-teal-400/40 flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="w-6 h-6" />
            <span>Capture Document Photo</span>
          </button>
        )}

        {/* Fallback File Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4 text-teal-400" />
          <span>Upload Image / PDF</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
        <span>Your prescription will be scanned and verified against the National Drug Formulary.</span>
      </div>
    </div>
  );
};
