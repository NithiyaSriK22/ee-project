import React, { useState, useEffect } from 'react';
import { DoctorReviewApi } from '../api/doctor-review.api';
import {
  FileText,
  Eye,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck,
  ShieldCheck,
  Calendar,
  Pill,
  Activity,
  AlertOctagon,
} from 'lucide-react';

interface MedicalRecordsSectionProps {
  visitId: string;
  onInspectDocument: (documentId: string) => void;
}

export const MedicalRecordsSection: React.FC<MedicalRecordsSectionProps> = ({
  visitId,
  onInspectDocument,
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [combinedSummary, setCombinedSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [showApprovalBox, setShowApprovalBox] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docs, combined] = await Promise.all([
        DoctorReviewApi.getMedicalRecords(visitId),
        DoctorReviewApi.getCombinedSummary(visitId),
      ]);
      setDocuments(docs);
      setCombinedSummary(combined);
      if (docs.length > 0 && !expandedDocId) {
        setExpandedDocId(docs[0].id);
      }
    } catch (err: any) {
      console.warn('Error fetching medical records and summaries:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visitId) {
      fetchData();
    }
  }, [visitId]);

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      const updated = await DoctorReviewApi.regenerateCombinedSummary(visitId);
      setCombinedSummary(updated);
    } catch (err: any) {
      alert(`Regeneration failed: ${err?.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      const updated = await DoctorReviewApi.approveCombinedSummary(visitId, doctorNotes);
      setCombinedSummary(updated);
      setShowApprovalBox(false);
    } catch (err: any) {
      alert(`Approval failed: ${err?.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Loading Medical Records & AI Summaries...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return null; // No uploaded documents for this visit
  }

  return (
    <div className="space-y-5 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Clinical Record Intelligence</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Medical Records & AI Summaries
          </h2>
          <p className="text-xs text-slate-500">
            Digitized prescriptions, laboratory findings, and multi-source consolidated summaries for this consultation.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Sub-Section C: AI Summary of All Uploaded Records */}
      {combinedSummary && (
        <div className="p-5 bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 text-white rounded-2xl border-2 border-teal-500/50 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base tracking-tight text-white">
                    AI Summary of All Uploaded Records
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                      combinedSummary.doctorReviewStatus === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    }`}
                  >
                    {combinedSummary.doctorReviewStatus === 'APPROVED' ? 'Physician Approved' : 'Awaiting Doctor Review'}
                  </span>
                </div>
                <p className="text-[11px] text-teal-200/80">
                  Consolidated across {combinedSummary.includedDocuments?.length || 0} of {combinedSummary.totalDocumentsCount} records • Generated {new Date(combinedSummary.generatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {combinedSummary.isStale && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Outdated (New uploads present)</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Summary'}</span>
              </button>
            </div>
          </div>

          {/* Consolidated Findings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Key Findings Across All Files */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-teal-500/30 space-y-2">
              <span className="font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <FileCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Consolidated Clinical Findings:</span>
              </span>
              <ul className="space-y-1.5 text-slate-200">
                {combinedSummary.consolidatedFindings?.map((f: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Active Medications Across Records */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-teal-500/30 space-y-2">
              <span className="font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Pill className="w-3.5 h-3.5 text-teal-400" />
                <span>Documented Active Prescriptions:</span>
              </span>
              {combinedSummary.activeMedications?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {combinedSummary.activeMedications.map((med: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-lg bg-teal-950/90 text-teal-200 border border-teal-700/60 font-mono text-[11px]"
                    >
                      {med.name} {med.dosage ? `(${med.dosage})` : ''}
                      <span className="text-slate-400 text-[9px] block">[{med.sourceDocument}]</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-[11px]">No active medications identified across documents.</p>
              )}
            </div>
          </div>

          {/* Abnormal Lab Results & Discrepancies */}
          {(combinedSummary.importantLabResults?.length > 0 || combinedSummary.potentialInconsistencies?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
              {combinedSummary.importantLabResults?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-teal-500/30 space-y-2">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Activity className="w-3.5 h-3.5 text-teal-400" />
                    <span>Laboratory Investigations:</span>
                  </span>
                  <div className="space-y-1">
                    {combinedSummary.importantLabResults.map((lab: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-1.5 rounded flex items-center justify-between text-[11px] ${
                          lab.isAbnormal ? 'bg-amber-950/60 text-amber-200 border border-amber-800/40' : 'text-slate-300'
                        }`}
                      >
                        <span className="font-semibold">{lab.testName}: {lab.value}</span>
                        <span className="text-[10px] text-slate-400">{lab.sourceDocument}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {combinedSummary.potentialInconsistencies?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/60 space-y-2">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cross-Document Inconsistencies:</span>
                  </span>
                  <ul className="space-y-1 text-amber-200 text-[11px]">
                    {combinedSummary.potentialInconsistencies.map((inc: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span>⚠</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Excluded or Failed Documents Callout */}
          {combinedSummary.excludedOrFailedDocuments?.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Excluded from automated summarization:</span>
                <span className="text-[11px] text-amber-300">
                  {combinedSummary.excludedOrFailedDocuments.map((d: any) => `${d.fileName} (${d.reason})`).join(', ')}.
                  {' '}Please review the original physical scans directly below.
                </span>
              </div>
            </div>
          )}

          {/* Doctor Approval Box */}
          <div className="pt-3 border-t border-teal-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>
                {combinedSummary.doctorReviewStatus === 'APPROVED'
                  ? `Approved by ${combinedSummary.doctorApprovedBy || 'Physician'} on ${new Date(combinedSummary.doctorApprovedAt).toLocaleDateString()}`
                  : 'Pending clinical sign-off by treating physician'}
              </span>
            </div>

            {combinedSummary.doctorReviewStatus !== 'APPROVED' && (
              <div>
                {showApprovalBox ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="Optional physician note..."
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-teal-500/40 text-white text-xs w-56"
                    />
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                    >
                      {isApproving ? 'Saving...' : 'Confirm Approval'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApprovalBox(false)}
                      className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowApprovalBox(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Records Summary</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Section A: Uploaded Medical Records Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Uploaded Medical Records ({documents.length})</span>
          </div>
          <span className="text-[11px] text-slate-500">Click any document to inspect original scan or view AI summary</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {documents.map((doc) => {
            const isExpanded = expandedDocId === doc.id;
            const summary = doc.summary;

            return (
              <div
                key={doc.id}
                className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs transition-all"
              >
                {/* Header row */}
                <div className="p-3.5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate max-w-sm">{doc.fileName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {doc.documentType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        doc.ocrStatus === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      OCR: {doc.ocrStatus}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        doc.overallStatus === 'FULLY_VERIFIED'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : doc.overallStatus === 'EXTRACTION_FAILED'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {doc.overallStatus}
                    </span>

                    <button
                      type="button"
                      onClick={() => onInspectDocument(doc.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer border border-slate-200"
                      title="Open full-resolution original document scan"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>View Original Document</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse' : 'Expand individual summary'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sub-Section B: Individual Document Summary */}
                {isExpanded && summary && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        <span className="font-bold text-slate-900 text-sm">
                          Individual AI Summary: {summary.reportOrTestName || doc.fileName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Date: {summary.documentDate || 'Not specified on document'}
                      </span>
                    </div>

                    {summary.importantFindings && summary.importantFindings.length > 0 && (
                      <div>
                        <span className="font-bold text-slate-700 block mb-1">Important Clinical Findings:</span>
                        <ul className="space-y-1 text-slate-600">
                          {summary.importantFindings.map((f: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-teal-600 font-bold">•</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {summary.medications && summary.medications.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                          <span className="font-bold text-slate-700 block mb-1">Prescriptions Documented:</span>
                          <div className="flex flex-wrap gap-1">
                            {summary.medications.map((m: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-mono"
                              >
                                {m.name} {m.dosage ? `(${m.dosage})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {summary.diagnoses && summary.diagnoses.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                          <span className="font-bold text-slate-700 block mb-1">Diagnoses Recorded:</span>
                          <div className="flex flex-wrap gap-1">
                            {summary.diagnoses.map((d: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[11px]"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {summary.missingOrUnreadableInfo && summary.missingOrUnreadableInfo.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Missing or Unreadable Information: </span>
                          <span>{summary.missingOrUnreadableInfo.join(' ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
