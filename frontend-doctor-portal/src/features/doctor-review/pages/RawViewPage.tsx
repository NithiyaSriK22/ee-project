import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorReviewApi } from '../api/doctor-review.api';
import { RawViewDTO } from '../types/doctor-review.types';
import { DocumentSnippetViewer } from '../components/DocumentSnippetViewer';
import {
  FileText,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  MessageSquare,
  Eye,
} from 'lucide-react';

export const RawViewPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();

  const [rawView, setRawView] = useState<RawViewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Manual record drafting
  const [manualStatements, setManualStatements] = useState<
    Array<{ section: string; text: string }>
  >([
    { section: 'CHIEF_COMPLAINT', text: '' },
    { section: 'HISTORY_OF_PRESENT_ILLNESS', text: '' },
    { section: 'MEDICATIONS_AND_ALLERGIES', text: '' },
  ]);
  const [attestationAccepted, setAttestationAccepted] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [activeSnippetDoc, setActiveSnippetDoc] = useState<any | null>(null);

  useEffect(() => {
    if (!visitId) return;
    setLoading(true);
    DoctorReviewApi.getRawView(visitId)
      .then((data) => {
        setRawView(data);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load raw intake view');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [visitId]);

  const handleAddManualSection = () => {
    setManualStatements((prev) => [...prev, { section: 'DOCTOR_CLINICAL_NOTE', text: '' }]);
  };

  const handleConfirmManualRecord = async () => {
    if (!visitId) return;
    const validStatements = manualStatements.filter((s) => s.text.trim().length > 0);
    if (validStatements.length === 0) {
      alert('Please enter at least one clinical statement for the manual record.');
      return;
    }
    if (!attestationAccepted) {
      alert('Please check the physician attestation before confirming.');
      return;
    }

    setIsConfirming(true);
    try {
      const reviewStart = await DoctorReviewApi.startReview(visitId);
      // Add each manual statement to review
      for (const stmt of validStatements) {
        await DoctorReviewApi.addStatement(reviewStart.reviewId, stmt.section, stmt.text.trim());
      }
      const record = await DoctorReviewApi.confirmReview(reviewStart.reviewId, true);
      navigate(`/confirmed-records/${record.id}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm manual record');
    } finally {
      setIsConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
        <p className="text-slate-600 text-sm font-medium">Assembling raw intake telemetry...</p>
      </div>
    );
  }

  if (error || !rawView) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
          <div className="flex items-center gap-2 font-semibold mb-2 text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Raw Intake View Unavailable
          </div>
          <p className="text-sm mb-4">{error || 'No intake records found for this visit.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/review/${visitId}`)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Raw Intake Telemetry & Fallback View</h1>
            <p className="text-xs text-slate-500 font-medium">
              Patient: {rawView.visitHeader.patientRegistrationNumber} | Dept: {rawView.visitHeader.department}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/review/${visitId}`)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
        >
          Return to Review Workspace
        </button>
      </div>

      {/* Fallback Banner (Section 20 requirement) */}
      <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 flex items-start gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold text-sm text-amber-900">
            No Summary Available — Showing Collected Information Directly
          </div>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            AI draft generation was unavailable, bypassed, or failed. Below is all direct information collected from kiosk interviews and scanned documents.
            You can verify the source fields and create an official physician record manually.
          </p>
        </div>
      </div>

      {/* Inline Document Crop Viewer if active */}
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

      {/* 2-Column Telemetry: Left = Interview, Right = Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interview Answers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <MessageSquare className="w-4 h-4 text-teal-600" />
            <span>Kiosk Interview Answers by Section</span>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {Object.entries(rawView.interviewAnswersBySection).map(([section, answers]) => (
              <div key={section} className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {section.replace(/_/g, ' ')}
                </div>
                {answers.map((ans) => (
                  <div
                    key={ans.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                  >
                    <div className="font-medium text-slate-800">{ans.promptText}</div>
                    <div className="font-mono font-bold text-teal-900 bg-white p-2 rounded border border-slate-200">
                      {typeof ans.answerValue === 'object' ? JSON.stringify(ans.answerValue) : String(ans.answerValue)}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Via: <strong>{ans.answeredVia}</strong></span>
                      {ans.isCritical && (
                        <span className="text-rose-600 font-bold">Critical Question</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {Object.keys(rawView.interviewAnswersBySection).length === 0 && (
              <p className="text-xs text-slate-400 italic">No structured interview answers recorded.</p>
            )}
          </div>
        </div>

        {/* Right: Validated Document Fields */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <FileText className="w-4 h-4 text-red-600" />
            <span>Validated Document Fields & OCR Telemetry</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {rawView.validatedDocumentFields.map((field) => (
              <div
                key={field.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{field.fieldType}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      field.result === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {field.result}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Doc: <code>{field.fileName}</code></span>
                  <span>Confidence: <strong>{Math.round(field.ocrConfidence * 100)}%</strong></span>
                </div>

                {field.matchedReferenceValue && (
                  <div className="text-emerald-800 font-mono text-xs bg-emerald-50/60 p-1.5 rounded border border-emerald-200">
                    Formulary Match: <strong>{field.matchedReferenceValue}</strong>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    onClick={() =>
                      setActiveSnippetDoc({
                        documentId: field.documentId,
                        snippetRef: field.id,
                        rawExtractedValue: field.matchedReferenceValue || field.fieldType,
                        matchedReferenceValue: field.matchedReferenceValue,
                        ocrConfidence: field.ocrConfidence,
                        verificationState: field.result,
                      })
                    }
                    className="text-xs font-semibold text-red-700 hover:text-red-800 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect Document Crop
                  </button>
                </div>
              </div>
            ))}

            {rawView.validatedDocumentFields.length === 0 && (
              <p className="text-xs text-slate-400 italic">No validated document fields present.</p>
            )}
          </div>
        </div>
      </div>

      {/* Manual Clinical Record Drafting Form */}
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-slate-900 text-base">Write & Confirm Manual Clinical Record</h2>
          </div>
          <button
            onClick={handleAddManualSection}
            className="text-xs font-bold text-red-600 hover:bg-red-50 px-2.5 py-1 rounded border border-red-200"
          >
            + Add Section
          </button>
        </div>

        <div className="space-y-3">
          {manualStatements.map((stmt, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Section: {stmt.section.replace(/_/g, ' ')}
              </label>
              <textarea
                value={stmt.text}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualStatements((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, text: val } : s))
                  );
                }}
                rows={2}
                placeholder="Enter physician observations and documented findings..."
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            id="manual-attest"
            type="checkbox"
            checked={attestationAccepted}
            onChange={(e) => setAttestationAccepted(e.target.checked)}
            className="w-4 h-4 text-red-600 rounded"
          />
          <label htmlFor="manual-attest" className="text-xs text-slate-700 cursor-pointer">
            <strong>Physician Attestation: </strong>
            I hereby confirm that I have reviewed the raw intake telemetry and document sources, and author this manual record.
          </label>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={handleConfirmManualRecord}
            disabled={!attestationAccepted || isConfirming}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {isConfirming ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving Manual Record...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Confirm Official Clinical Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
