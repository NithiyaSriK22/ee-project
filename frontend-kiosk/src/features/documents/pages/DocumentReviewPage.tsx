import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../api/documents.api';
import { UploadedDocumentItem } from '../types/documents.types';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export const DocumentReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<UploadedDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const list = await documentsApi.listVisitDocuments();
        setDocuments(list);
      } catch (e) {
        console.error('Failed to fetch documents:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocs();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading your digitized medical documents...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between py-8 px-4 sm:px-6 animate-fadeIn">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Document Digitization Review</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Your Scanned Records
          </h1>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            These documents will be reviewed by the consulting physician alongside your guided interview answers.
          </p>
        </div>

        {/* Document List */}
        {documents.length === 0 ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">No prescriptions or documents have been scanned for this visit.</p>
            <button
              onClick={() => navigate('/documents/scan')}
              className="py-3 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Scan Prescription Paper</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-4 shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-teal-400" />
                      <h3 className="text-base font-bold text-white">{doc.documentType}</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{doc.fileName}</p>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase flex items-center gap-1.5 ${
                      doc.overallStatus === 'FULLY_VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : doc.overallStatus === 'NEEDS_PHYSICIAN_REVIEW'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    }`}
                  >
                    {doc.overallStatus === 'FULLY_VERIFIED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{doc.overallStatus}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => navigate('/documents/scan')}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-teal-400" />
            <span>Scan Another Document</span>
          </button>

          <button
            onClick={() => navigate('/interview')}
            className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-extrabold text-base shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <span>Continue to Guided Interview</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <footer className="w-full border-t border-slate-900 py-3 text-center text-xs text-slate-500 mt-8">
        THUNAI • Deterministic Document Digitization & Verification
      </footer>
    </div>
  );
};
