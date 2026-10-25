import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorReviewApi } from '../api/doctor-review.api';
import {
  ReviewWorkspaceDTO,
  VisitQueueEntryDTO,
  WorkspaceStatementItem,
  ResolutionType,
  RejectionReason,
  RejectionReasons,
} from '../types/doctor-review.types';
import { useAuth } from '../../auth/hooks/useAuth';
import { QueuePanel } from '../components/QueuePanel';
import { AlertBanner } from '../components/AlertBanner';
import { SummarySection } from '../components/SummarySection';
import { MustResolveCard } from '../components/MustResolveCard';
import { ProvenancePanel } from '../components/ProvenancePanel';
import { ConfirmBar } from '../components/ConfirmBar';
import { DocumentSnippetViewer } from '../components/DocumentSnippetViewer';
import { MedicalRecordsSection } from '../components/MedicalRecordsSection';
import {
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Layers,
  Eye,
  ShieldAlert,
  FileText,
} from 'lucide-react';

export const ReviewWorkspacePage: React.FC = () => {
  const { visitId: routeVisitId } = useParams<{ visitId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [queue, setQueue] = useState<VisitQueueEntryDTO[]>([]);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(routeVisitId || null);
  const [workspace, setWorkspace] = useState<ReviewWorkspaceDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<WorkspaceStatementItem | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>(RejectionReasons.INACCURATE);
  const [rejectionNote, setRejectionNote] = useState<string>('');

  // Failed OCR Document High-Resolution Inspection Modal (P2.2)
  const [inspectingDocumentId, setInspectingDocumentId] = useState<string | null>(null);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    try {
      const q = await DoctorReviewApi.getQueue(user?.hospitalDepartment || undefined);
      setQueue(q);
      if (!activeVisitId && q.length > 0) {
        setActiveVisitId(q[0].visitId);
      }
    } catch (err: any) {
      console.warn('Failed to load doctor queue:', err?.message);
    }
  }, [user?.hospitalDepartment, activeVisitId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Fetch workspace for active visit
  const fetchWorkspace = useCallback(async (visitId: string, outOfQueueReason?: string) => {
    setLoading(true);
    setError(null);
    try {
      // First ensure claim and review started
      try {
        await DoctorReviewApi.claimVisit(visitId, outOfQueueReason);
      } catch (claimErr: any) {
        // If claimed by other doctor or warning, continue to load workspace
        console.warn('Claim note:', claimErr?.message);
      }

      await DoctorReviewApi.startReview(visitId, outOfQueueReason);
      const ws = await DoctorReviewApi.getWorkspace(visitId, outOfQueueReason);
      setWorkspace(ws);

      // Default select first statement for provenance if available
      if (ws.summary && ws.summary.sections.length > 0 && ws.summary.sections[0].statements.length > 0) {
        setSelectedStatement(ws.summary.sections[0].statements[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load review workspace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeVisitId) {
      fetchWorkspace(activeVisitId);
    }
  }, [activeVisitId, fetchWorkspace]);

  // Handlers
  const handleSelectVisit = (visitId: string, outOfQueueReason?: string) => {
    setActiveVisitId(visitId);
    navigate(`/review/${visitId}`, { replace: true });
    fetchWorkspace(visitId, outOfQueueReason);
  };

  const handleResolveItem = async (
    itemRef: string,
    resolutionType: ResolutionType,
    correctedValue?: string,
    viewedSource?: boolean
  ) => {
    if (!workspace?.reviewState.reviewId) return;
    await DoctorReviewApi.saveResolution(workspace.reviewState.reviewId, {
      itemRef,
      resolutionType,
      correctedValue,
      viewedSource,
    });
    // Refresh workspace to get updated must-resolve evaluation
    if (activeVisitId) {
      const updated = await DoctorReviewApi.getWorkspace(activeVisitId);
      setWorkspace(updated);
    }
  };

  const handleEditStatement = async (statementId: string, editedText: string) => {
    if (!workspace?.reviewState.reviewId) return;
    await DoctorReviewApi.editStatement(workspace.reviewState.reviewId, statementId, editedText);
    if (activeVisitId) {
      const updated = await DoctorReviewApi.getWorkspace(activeVisitId);
      setWorkspace(updated);
    }
  };

  const handleAddStatement = async (section: string, statementText: string) => {
    if (!workspace?.reviewState.reviewId) return;
    await DoctorReviewApi.addStatement(workspace.reviewState.reviewId, section, statementText);
    if (activeVisitId) {
      const updated = await DoctorReviewApi.getWorkspace(activeVisitId);
      setWorkspace(updated);
    }
  };

  const handleRemoveStatement = async (statementId: string) => {
    if (!workspace?.reviewState.reviewId) return;
    await DoctorReviewApi.removeStatement(workspace.reviewState.reviewId, statementId);
    if (activeVisitId) {
      const updated = await DoctorReviewApi.getWorkspace(activeVisitId);
      setWorkspace(updated);
    }
  };

  const handleConfirm = async (attestationAccepted: boolean) => {
    if (!workspace?.reviewState.reviewId) return;
    setIsConfirming(true);
    try {
      const record = await DoctorReviewApi.confirmReview(
        workspace.reviewState.reviewId,
        attestationAccepted
      );
      navigate(`/confirmed-records/${record.id}`);
    } catch (err: any) {
      alert(err?.message || 'Confirmation failed');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!workspace?.reviewState.reviewId) return;
    try {
      await DoctorReviewApi.rejectSummary(workspace.reviewState.reviewId, {
        rejectionReason,
        rejectionNote,
      });
      setShowRejectModal(false);
      alert('Draft summary rejected. You may proceed with raw view or regenerate.');
      if (activeVisitId) fetchWorkspace(activeVisitId);
    } catch (err: any) {
      alert(err?.message || 'Failed to reject draft');
    }
  };

  const handleRegenerate = async () => {
    if (!workspace?.reviewState.reviewId) return;
    try {
      await DoctorReviewApi.requestRegeneration(
        workspace.reviewState.reviewId,
        'Physician requested draft re-assembly'
      );
      alert('Regeneration requested from Module 5. Refreshing...');
      if (activeVisitId) fetchWorkspace(activeVisitId);
    } catch (err: any) {
      alert(err?.message || 'Failed to request regeneration');
    }
  };

  return (
    <div className="space-y-4">
      {/* 3-Pane Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)] min-h-[650px]">
        {/* Left Pane: Queue (3 cols) */}
        <div className="lg:col-span-3 h-full">
          <QueuePanel
            entries={queue}
            selectedVisitId={activeVisitId || undefined}
            currentDoctorId={user?.id}
            onSelectVisit={handleSelectVisit}
            onRefresh={fetchQueue}
          />
        </div>

        {/* Center Pane: Review Workspace (6 cols) */}
        <div className="lg:col-span-6 h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
              <p className="text-sm font-semibold">Loading Patient Review Workspace...</p>
            </div>
          ) : error ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Unable to Load Workspace</h3>
              <p className="text-xs text-slate-600 max-w-md mb-4">{error}</p>
              {activeVisitId && (
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/review/${activeVisitId}/raw`)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                  >
                    Open Raw Fallback View
                  </button>
                  <button
                    onClick={() => fetchWorkspace(activeVisitId)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : workspace ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Patient Header Strip */}
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                    PT
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <span>{workspace.visitHeader.patientRegistrationNumber}</span>
                      {workspace.visitHeader.patientAge && (
                        <span className="text-xs text-slate-500 font-normal">
                          ({workspace.visitHeader.patientAge}y, {workspace.visitHeader.patientGender || 'Unspecified'})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Dept: <strong>{workspace.visitHeader.department}</strong></span>
                      {workspace.visitHeader.isCompanionAssisted && (
                        <span className="text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 font-medium">
                          Companion Assisted ({workspace.visitHeader.companionRelationship || 'Family'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {workspace.rawViewAvailable && (
                    <button
                      onClick={() => navigate(`/review/${workspace.visitHeader.visitId}/raw`)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded border border-slate-200 transition-colors"
                    >
                      View Raw Intake
                    </button>
                  )}
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Policy {workspace.policyVersion}
                  </span>
                </div>
              </div>

              {/* Mid-review Newer Summary Version Banner (Section 15) */}
              {workspace.summary?.isStale && (
                <div className="px-5 py-2.5 bg-amber-100/80 border-b border-amber-300 text-amber-950 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <Layers className="w-4 h-4 text-amber-700 animate-spin" />
                    <span>A newer summary version is available (v{workspace.summary.newerVersionAvailable}).</span>
                  </div>
                  <button
                    onClick={() => {
                      if (activeVisitId) fetchWorkspace(activeVisitId);
                    }}
                    className="px-2.5 py-1 rounded bg-amber-700 text-white font-bold text-xs hover:bg-amber-800 transition-colors"
                  >
                    Switch to Newer Version
                  </button>
                </div>
              )}

              {/* Scrollable Summary Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Emergency Alert Banner */}
                <AlertBanner
                  alerts={workspace.alerts}
                  alertDisclaimer={workspace.alertDisclaimer}
                />

                {/* Stage 4: Prominent Amber Warning for Failed/Unreadable Digitization */}
                {workspace.failedDocuments && workspace.failedDocuments.length > 0 && (
                  <div className="space-y-3">
                    {workspace.failedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 bg-amber-50 rounded-xl border-2 border-amber-400 text-amber-950 flex flex-col gap-3 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center shrink-0 text-amber-800 mt-0.5">
                              <AlertTriangle className="w-4.5 h-4.5 text-amber-700" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-amber-950 flex flex-wrap items-center gap-2">
                                <span>Document could not be reliably digitized. Please review the original document.</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-200 text-amber-900 border border-amber-300">
                                  OCR: {doc.ocrStatus || 'FAILED'}
                                </span>
                              </div>
                              <div className="text-xs text-amber-900 mt-0.5 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>
                                  Source File: <strong className="font-mono">{doc.fileName}</strong> ({doc.documentType || 'PRESCRIPTION'})
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInspectingDocumentId(doc.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Click to view original high-resolution scan</span>
                          </button>
                        </div>

                        {/* Extraction Details & Missing Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-amber-200 text-xs">
                          <div className="p-2.5 bg-amber-100/70 rounded-lg border border-amber-300">
                            <span className="font-semibold text-amber-900 block mb-0.5">Missing or Uncertain Fields:</span>
                            <span className="text-amber-900 font-mono text-[11px] font-medium">
                              {doc.missingFields && doc.missingFields.length > 0
                                ? doc.missingFields.join(', ')
                                : 'All core clinical fields unverified (manual extraction required)'}
                            </span>
                          </div>
                          <div className="p-2.5 bg-amber-100/70 rounded-lg border border-amber-300">
                            <span className="font-semibold text-amber-900 block mb-0.5">Available Extracted Text:</span>
                            <span className="text-amber-900 font-mono text-[11px] truncate block">
                              {doc.extractedTextSnippet || '[No legible text extracted — manual review required]'}
                            </span>
                          </div>
                        </div>

                        {/* Distinction between verified and unverified information */}
                        <div className="flex items-center gap-2 text-[11px] text-amber-950 bg-amber-200/60 p-2 rounded-lg border border-amber-300">
                          <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0" />
                          <span>
                            <strong>Unverified Information Notice:</strong> Unreadable and unverified extractions are withheld from confirmed records to prevent clinical errors. All entries require physician verification.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Draft Status Indicator */}
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  workspace.summary?.isMock
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                    : workspace.summary?.generationMode === 'TEMPLATE_FALLBACK'
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-blue-50/60 border-blue-200 text-blue-950'
                }`}>
                  <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${workspace.summary?.isMock ? 'text-amber-600' : 'text-blue-600'}`} />
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>{workspace.summary?.isMock ? 'Simulated AI Draft Summary' : 'AI Clinical Draft Summary'} (v{workspace.summary?.version || 1})</span>
                      {workspace.summary?.isMock && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                          MOCK SIMULATION — NOT REAL AI
                        </span>
                      )}
                      {workspace.summary?.generationMode === 'TEMPLATE_FALLBACK' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                          TEMPLATE FALLBACK
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <span>
                        Mode: <strong className="font-mono">{workspace.summary?.generationMode || 'LLM'}</strong>
                        {workspace.summary?.providerId && <span className="ml-1 text-slate-600 font-mono">[{workspace.summary.providerId}]</span>}.
                        {' '}
                        {workspace.summary?.safetyLabel || 'This draft is an intake organization aid and NOT a medical fact until confirmed by the physician.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Medical Records Section: All Uploaded Records, Individual Summaries & Combined Cross-Document Synthesis */}
                <MedicalRecordsSection
                  visitId={workspace.visitHeader.visitId}
                  onInspectDocument={(docId) => setInspectingDocumentId(docId)}
                />

                {/* Top Must-Resolve Cards */}
                {workspace.mustResolveItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-red-200 pb-1">
                      <span className="flex items-center gap-1.5 text-red-700">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Items Requiring Physician Resolution ({workspace.unresolvedCount} pending)
                      </span>
                    </div>
                    {workspace.mustResolveItems.map((item) => (
                      <MustResolveCard
                        key={item.itemRef}
                        item={item}
                        reviewId={workspace.reviewState.reviewId}
                        onResolve={handleResolveItem}
                        onInspectStatement={(sourceRef) => {
                          // Find statement with this source ref
                          for (const sec of workspace.summary?.sections || []) {
                            for (const stmt of sec.statements) {
                              if (stmt.sources.some((s) => s.sourceRef === sourceRef)) {
                                setSelectedStatement(stmt);
                                return;
                              }
                            }
                          }
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Clinical Sections */}
                {workspace.summary?.sections.map((section) => (
                  <SummarySection
                    key={section.section}
                    section={section}
                    selectedStatement={selectedStatement}
                    mustResolveItems={workspace.mustResolveItems}
                    reviewId={workspace.reviewState.reviewId}
                    onSelectStatement={(stmt) => setSelectedStatement(stmt)}
                    onEditStatement={handleEditStatement}
                    onRemoveStatement={handleRemoveStatement}
                    onAddStatement={handleAddStatement}
                    onResolveItem={handleResolveItem}
                  />
                ))}

                {(!workspace.summary || workspace.summary.sections.length === 0) && (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-sm font-semibold">No structured summary sections generated.</p>
                    <button
                      onClick={() => navigate(`/review/${workspace.visitHeader.visitId}/raw`)}
                      className="mt-2 text-xs font-bold text-red-600 hover:underline"
                    >
                      Open Raw View to confirm manual clinical record
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Confirm Bar */}
              <ConfirmBar
                unresolvedCount={workspace.unresolvedCount}
                mustResolveItems={workspace.mustResolveItems}
                passiveFlags={workspace.passiveFlags}
                attestationText={workspace.attestation.text}
                attestationVersion={workspace.attestation.version}
                isConfirming={isConfirming}
                onConfirm={handleConfirm}
                onRejectDraft={() => setShowRejectModal(true)}
                onRegenerateDraft={handleRegenerate}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
              Select a patient from the queue to start review.
            </div>
          )}
        </div>

        {/* Right Pane: Sources & Provenance Inspector (3 cols) */}
        <div className="lg:col-span-3 h-full">
          <ProvenancePanel
            selectedStatement={selectedStatement}
            onClose={() => setSelectedStatement(null)}
          />
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Reject AI Summary Draft</h3>
            <p className="text-xs text-slate-500">
              Select the controlled reason for rejecting this draft version. All rejections are retained for quality review in Module 9.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason Code:</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
                className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value={RejectionReasons.INACCURATE}>Inaccurate (Clinical discrepancies)</option>
                <option value={RejectionReasons.INCOMPLETE}>Incomplete (Missing critical history)</option>
                <option value={RejectionReasons.WRONG_PATIENT_DATA}>Wrong Patient Data (Identity mismatch)</option>
                <option value={RejectionReasons.OTHER}>Other (Specify in note below)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Optional Quality Note:</label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={2}
                placeholder="Details for clinical auditing..."
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Document Inspection Modal (P2.2) */}
      {inspectingDocumentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-amber-300 overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-amber-950">
                  Original Handwritten Document Inspection
                </h3>
              </div>
              <button
                onClick={() => setInspectingDocumentId(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
              >
                Close Preview
              </button>
            </div>
            <div className="p-4">
              <DocumentSnippetViewer
                documentId={inspectingDocumentId}
                verificationState="UNREADABLE"
                rawExtractedValue="Handwritten prescription could not be automatically digitized. Please inspect the original optical scan directly."
                onClose={() => setInspectingDocumentId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
