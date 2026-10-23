import { DoctorReviewRepository, checkDatabaseAvailability } from '../doctor-review.repository.js';
import { ReviewPolicyService } from '../review/review-policy.service.js';
import { MustResolveEvaluator } from '../review/must-resolve.evaluator.js';
import { SummaryService } from '../../summary/summary.service.js';
import { DocumentsService } from '../../documents/documents.service.js';
import { InterviewService } from '../../interview/interview.service.js';
import { RedFlagsService } from '../../redflags/redflags.service.js';
import { ClaimService } from '../review/claim.service.js';
import { prisma } from '../../../database/prisma.js';
import { StaffUserPayload } from '../../../types/auth.types.js';
import {
  ReviewWorkspaceDTO,
  RawViewDTO,
  WorkspaceVisitHeader,
  WorkspaceAlertItem,
  WorkspaceSummaryPayload,
  WorkspaceSectionItem,
  WorkspaceStatementItem,
  ConfidentialSensitiveResponseItem,
} from './workspace.dto.js';
import {
  DoctorReviewStatuses,
  DoctorReviewAuditEvents,
  QueueStatuses,
} from '../doctor-review.types.js';
import { ForbiddenError } from '../../../errors/app-error.js';

export class WorkspaceService {
  private static readonly ALERT_DISCLAIMER =
    'Clinical Disclaimer: Automated red-flag alerts and AI drafts assist triage and case-taking. Absence of an alert does not guarantee clinical stability. Treating physician judgment supersedes all automated outputs.';

  /**
   * Assembles the read model for the Doctor Review Workspace
   */
  public static async getWorkspace(
    visitId: string,
    user: StaffUserPayload,
    options?: { outOfQueueReason?: string }
  ): Promise<ReviewWorkspaceDTO> {
    // 1. Scoping Enforcement (Section 7)
    if (user.role === 'STAFF_ATTENDANT') {
      throw new ForbiddenError(
        'Staff attendants are restricted from clinical review summaries by hospital policy.'
      );
    }
    if (user.role === 'ADMIN') {
      throw new ForbiddenError('Administrative accounts do not have access to clinical review workspace.');
    }

    // 2. Queue entry & department scoping check
    let queueEntry = await DoctorReviewRepository.getQueueEntry(visitId);
    if (!queueEntry) {
      queueEntry = await DoctorReviewRepository.upsertQueueEntry({
        visitId,
        department: user.hospitalDepartment || 'General Medicine',
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });
    }

    const isDifferentDept = (d1?: string | null, d2?: string | null): boolean => {
      if (!d1 || !d2) return false;
      const c1 = d1.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
      const c2 = d2.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
      return c1 !== c2 && !c1.includes(c2) && !c2.includes(c1);
    };

    if (
      user.role === 'DOCTOR' &&
      user.hospitalDepartment &&
      queueEntry.department &&
      isDifferentDept(user.hospitalDepartment, queueEntry.department)
    ) {
      if (!options?.outOfQueueReason) {
        throw new ForbiddenError(
          `Out-of-department case review requires a typed justification reason (Case dept: ${queueEntry.department}).`
        );
      }
      await DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.OUT_OF_QUEUE_ACCESS,
        visitId,
        actorId: user.id,
        actorRole: user.role,
        metadata: {
          doctorDepartment: user.hospitalDepartment,
          caseDepartment: queueEntry.department,
          reason: options.outOfQueueReason,
        },
      });
    }

    // 3. Assemble Visit Header
    const visitHeader = await this.assembleVisitHeader(visitId, queueEntry.department);

    // 4. Fetch Module 6 Alerts
    let alerts: WorkspaceAlertItem[] = [];
    try {
      const redflagAlerts = await RedFlagsService.listAlerts({ visitId });
      alerts = redflagAlerts.map((a) => ({
        id: a.id,
        severityTier: a.severityTier,
        status: a.status,
        kioskLocation: a.kioskLocation,
        ruleCode: a.ruleCode,
        raisedAt: a.raisedAt,
        acknowledgedBy: a.acknowledgedBy,
        acknowledgedAt: a.acknowledgedAt,
      }));
    } catch {
      alerts = [];
    }

    const isDbUp = await checkDatabaseAvailability();

    // 5. Fetch Module 5 Clinical Summary Draft
    let m5Summary: any = null;
    if (isDbUp) {
      try {
        m5Summary = await SummaryService.getLatestSummaryForVisit(visitId, user);
      } catch {
        // Summary might be missing or failed - raw fallback available
      }
    }

    // 6. Fetch Module 4 Validated Document Fields
    let docFields: any[] = [];
    try {
      const docs = await DocumentsService.getValidatedDocumentFieldsForVisit(visitId);
      for (const doc of docs) {
        for (const f of doc.validatedFields) {
          docFields.push({
            id: f.id,
            documentId: doc.documentId,
            documentType: doc.documentType,
            fileName: doc.fileName,
            fieldType: f.fieldType,
            isCritical: f.isCritical,
            result: f.result,
            evalState: f.evalState,
            matchedReferenceValue: f.matchedReferenceValue,
            matchScore: f.matchScore,
            ocrConfidence: f.ocrConfidence,
            explanation: f.explanation,
            rawText: (f as any).rawText,
            sourceSnippetRef: (f as any).sourceSnippetRef,
          });
        }
      }
    } catch {
      docFields = [];
    }

    // 7. Fetch Module 3 Interview Answers
    let interviewAnswers: any[] = [];
    if (isDbUp) {
      try {
        const interview = await InterviewService.getCompletedAnswers(visitId);
        interviewAnswers = interview.answers || [];
      } catch {
        interviewAnswers = [];
      }
    }

    // 8. Fetch Active Review State & Claim
    let activeReview = await DoctorReviewRepository.getActiveReviewByVisitId(visitId);
    let claim = await ClaimService.getClaim(visitId);
    const resolutions = activeReview ? await DoctorReviewRepository.getResolutions(activeReview.id) : [];
    const edits = activeReview ? await DoctorReviewRepository.getStatementEdits(activeReview.id) : [];
    const additions = activeReview ? await DoctorReviewRepository.getDoctorAddedStatements(activeReview.id) : [];
    const removedSet = activeReview ? await DoctorReviewRepository.getRemovedStatementIds(activeReview.id) : new Set<string>();

    // 9. Mid-Review Staleness Detection (Section 15)
    let isStale = false;
    let newerVersionAvailable: number | null = null;
    if (activeReview && m5Summary && m5Summary.version > activeReview.baseSummaryVersion) {
      isStale = true;
      newerVersionAvailable = m5Summary.version;
    }

    // 10. Pure Deterministic Must-Resolve Evaluation (Section 9)
    const policy = ReviewPolicyService.getActivePolicy();
    const allStatements = m5Summary?.sections?.flatMap((s: any) => s.statements) || [];

    const evaluatorResult = MustResolveEvaluator.evaluate(
      {
        visitId,
        documentFields: docFields,
        interviewAnswers,
        summaryStatements: allStatements,
        alerts: alerts.map((a) => ({
          id: a.id,
          severityTier: a.severityTier,
          status: a.status,
          kioskLocation: a.kioskLocation,
          ruleCode: a.ruleCode,
          acknowledgedBy: a.acknowledgedBy,
          acknowledgedAt: a.acknowledgedAt,
        })),
      },
      resolutions,
      policy
    );

    // 10b. Detect unreadable/failed uploaded documents and enforce doctor inspection (P2.2)
    let failedDocuments: any[] = [];
    try {
      const allDocs = await DocumentsService.listVisitDocuments(visitId);
      failedDocuments = (allDocs || [])
        .filter((d: any) => d.ocr_status === 'FAILED' || d.overall_status === 'EXTRACTION_FAILED')
        .map((d: any) => {
          const missingFields: string[] = [];
          if (d.document_type === 'PRESCRIPTION') {
            missingFields.push('Medication Name', 'Dosage & Frequency', 'Allergies & Reactions');
          } else if (d.document_type === 'LAB_REPORT') {
            missingFields.push('Investigation Name', 'Lab Result Value', 'Reference Range');
          } else {
            missingFields.push('Clinical Findings', 'Physician Orders');
          }

          return {
            id: d.id,
            fileName: d.file_name,
            documentType: d.document_type,
            ocrStatus: d.ocr_status || 'FAILED',
            ocrErrorMessage: d.ocr_error_message || 'Document could not be reliably digitized. Please review the original document.',
            uploadedAt: d.uploaded_at instanceof Date ? d.uploaded_at.toISOString() : String(d.uploaded_at || new Date().toISOString()),
            missingFields,
            extractedTextSnippet: d.ocr_error_message?.includes('recognized:') ? d.ocr_error_message : '[No legible text extracted — manual review required]',
            confidence: 0,
            unverifiedNotice: 'Document could not be reliably digitized. Please review the original document.',
          };
        });

      for (const fDoc of failedDocuments) {
        const itemRef = `doc-failed:${fDoc.id}`;
        const sourceHash = MustResolveEvaluator.computeSourceHash(`FAILED:${fDoc.id}:${fDoc.fileName}`);
        const resolution = resolutions.find((r) => r.itemRef === itemRef);
        const isResolved = !!(resolution && (!resolution.sourceHash || resolution.sourceHash === sourceHash));

        const isHandwritten = fDoc.fileName?.toLowerCase().includes('handwritten') || fDoc.ocrErrorMessage?.toLowerCase().includes('handwritten');

        evaluatorResult.mustResolveItems.unshift({
          itemRef,
          itemType: 'DOCUMENT_FIELD' as any,
          title: isHandwritten
            ? 'Handwritten prescription could not be automatically digitized'
            : 'Document could not be reliably digitized. Please review the original document.',
          description: `Document digitization failed for "${fDoc.fileName}". Manual review against original high-resolution scan required. Missing fields: ${fDoc.missingFields.join(', ')}.`,
          sourceType: 'DOCUMENT',
          sourceRef: fDoc.id,
          sourceSnippetRef: 'original_scan',
          rawExtractedValue: '[HANDWRITTEN UNREADABLE]',
          matchedReferenceValue: null,
          ocrConfidence: 0,
          verificationState: 'UNREADABLE',
          sourceHash,
          isResolved,
          resolution: isResolved ? resolution : null,
        });

        if (!isResolved) {
          evaluatorResult.unresolvedCount++;
        }
      }
    } catch {
      failedDocuments = [];
    }

    // 11. Assemble Structured Summary Sections with Doctor Edits & Additions
    let summaryPayload: WorkspaceSummaryPayload | null = null;
    if (m5Summary) {
      const editMap = new Map(edits.map((e) => [e.originalStatementId, e]));

      const sections: WorkspaceSectionItem[] = (m5Summary.sections || []).map((sec: any) => {
        const statements: WorkspaceStatementItem[] = (sec.statements || []).map((stmt: any) => {
          const edit = stmt.id ? editMap.get(stmt.id) : null;
          const isRemoved = stmt.id ? removedSet.has(stmt.id) : false;

          return {
            id: stmt.id || crypto.randomUUID(),
            section: sec.section,
            text: edit ? edit.editedText : stmt.text,
            origin: edit ? 'DOCTOR_EDITED' : stmt.origin,
            originalDraftText: edit ? stmt.text : null,
            order: stmt.order,
            sources: stmt.sources || [],
            isEdited: !!edit,
            isDoctorAdded: false,
            isRemoved,
          };
        });

        // Add doctor added statements for this section
        const addedForSec = additions.filter((a) => a.section === sec.section);
        for (const added of addedForSec) {
          statements.push({
            id: added.id || crypto.randomUUID(),
            section: sec.section,
            text: added.text,
            origin: 'DOCTOR_ADDED',
            originalDraftText: null,
            order: added.order,
            sources: [],
            isEdited: false,
            isDoctorAdded: true,
            isRemoved: false,
          });
        }

        statements.sort((a, b) => a.order - b.order);

        return {
          section: sec.section,
          order: sec.order,
          statements,
        };
      });

      const isMock = m5Summary.isMock ?? (m5Summary.modelId === 'medikiosk-constrained-summary-v1');
      const providerId = m5Summary.providerId || (isMock ? 'MOCK_PROVIDER' : (m5Summary.modelId ? 'LOCAL_LLM' : null));
      const safetyLabel = m5Summary.safetyLabel || (m5Summary.generationMode === 'TEMPLATE_FALLBACK'
        ? 'Template-only fallback draft — not confirmed by a doctor'
        : isMock
        ? 'Mock AI draft (deterministic simulation) — not confirmed by a doctor'
        : 'AI-assisted draft (Local LLM) — not confirmed by a doctor');

      summaryPayload = {
        id: m5Summary.id,
        version: m5Summary.version,
        status: m5Summary.status,
        generationMode: m5Summary.generationMode,
        providerId,
        isMock,
        safetyLabel,
        modelId: m5Summary.modelId,
        modelVersion: m5Summary.modelVersion,
        isStale: isStale || m5Summary.status === 'STALE',
        newerVersionAvailable,
        sections,
      };
    }

    // 12. Assemble Confidential Sensitive Responses for Doctor Review (Module 3B)
    const confidentialSensitiveResponses: ConfidentialSensitiveResponseItem[] = [];
    for (const ans of interviewAnswers) {
      const isSensitive =
        ans.sensitivityLevel === 'SENSITIVE' ||
        ans.sensitivityLevel === 'HIGHLY_SENSITIVE' ||
        ans.visibilityScope === 'DOCTOR_ONLY' ||
        ans.isDeferredToDoctor ||
        (ans.answerValue && typeof ans.answerValue === 'object' && ans.answerValue.status === 'DEFERRED_TO_DOCTOR');

      if (isSensitive) {
        const verbatimVal =
          typeof ans.answerValue === 'object' && ans.answerValue !== null
            ? (ans.answerValue.status === 'DEFERRED_TO_DOCTOR'
                ? `[DEFERRED TO DOCTOR]: ${ans.answerValue.deferralReason || 'Patient requested private discussion'}`
                : String(ans.answerValue.value ?? JSON.stringify(ans.answerValue)))
            : String(ans.answerValue ?? '');

        confidentialSensitiveResponses.push({
          id: ans.id,
          questionId: ans.questionId || ans.id,
          section: ans.section || 'SENSITIVE',
          promptText: ans.promptText,
          answerValue: ans.answerValue,
          verbatimDisplay: verbatimVal,
          provenance: ans.provenance || 'Patient (Self-Reported)',
          isDeferredToDoctor: !!(ans.isDeferredToDoctor || (ans.answerValue && ans.answerValue.status === 'DEFERRED_TO_DOCTOR')),
          sensitivityLevel: ans.sensitivityLevel || 'SENSITIVE',
          visibilityScope: ans.visibilityScope || 'DOCTOR_ONLY',
        });
      }
    }

    // 13. Audit Access
    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.SUMMARY_VIEWED,
      visitId,
      actorId: user.id,
      actorRole: user.role,
    });

    const attestation = ReviewPolicyService.getAttestationText();

    return {
      visitHeader,
      alerts,
      alertDisclaimer: this.ALERT_DISCLAIMER,
      summary: summaryPayload,
      mustResolveItems: evaluatorResult.mustResolveItems,
      unresolvedCount: evaluatorResult.unresolvedCount,
      passiveFlags: evaluatorResult.passiveFlags,
      confidentialSensitiveResponses,
      reviewState: {
        reviewId: activeReview?.id || null,
        status: activeReview?.status || DoctorReviewStatuses.IN_REVIEW,
        baseSummaryVersion: activeReview?.baseSummaryVersion || m5Summary?.version || 1,
        resolutions,
        statementEdits: edits,
        doctorAddedStatements: additions,
        claim,
      },
      policyVersion: policy.version,
      attestation,
      rawViewAvailable: true,
      timelineAvailable: true,
      failedDocuments,
      longitudinalDiff: {
        hasPriorVisit: false,
        priorVisitDate: null,
        totalChanges: 0,
      },
    };
  }


  /**
   * Assembles the Raw View (Fallback view without AI summary)
   */
  public static async getRawView(visitId: string, user: StaffUserPayload): Promise<RawViewDTO> {
    if (user.role !== 'DOCTOR' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Raw clinical view access is restricted to treating physicians.');
    }

    const queueEntry = await DoctorReviewRepository.getQueueEntry(visitId);
    const visitHeader = await this.assembleVisitHeader(visitId, queueEntry?.department || 'General Medicine');

    // 1. Alerts
    let alerts: WorkspaceAlertItem[] = [];
    try {
      const redflagAlerts = await RedFlagsService.listAlerts({ visitId });
      alerts = redflagAlerts.map((a) => ({
        id: a.id,
        severityTier: a.severityTier,
        status: a.status,
        kioskLocation: a.kioskLocation,
        ruleCode: a.ruleCode,
        raisedAt: a.raisedAt,
        acknowledgedBy: a.acknowledgedBy,
        acknowledgedAt: a.acknowledgedAt,
      }));
    } catch {
      alerts = [];
    }

    // 2. Interview answers grouped by section
    const interviewAnswersBySection: Record<string, any[]> = {};
    const validatedDocumentFields: any[] = [];

    const isDbUp = await checkDatabaseAvailability();
    if (isDbUp) {
      try {
        const interview = await InterviewService.getCompletedAnswers(visitId);
        for (const ans of interview.answers || []) {
          const sec = ans.section || 'GENERAL';
          if (!interviewAnswersBySection[sec]) {
            interviewAnswersBySection[sec] = [];
          }
          interviewAnswersBySection[sec].push({
            id: ans.id,
            promptText: ans.promptText,
            answerValue: ans.answerValue,
            answeredVia: ans.answeredVia,
            languageUsed: ans.languageUsed,
            isCritical: ans.isCritical,
            isSkipped: ans.isSkipped,
          });
        }
      } catch {
        // Empty interview
      }

      // 3. Validated document fields
      try {
        const docs = await DocumentsService.getValidatedDocumentFieldsForVisit(visitId);
        for (const doc of docs) {
          for (const f of doc.validatedFields) {
            validatedDocumentFields.push({
              id: f.id,
              documentId: doc.documentId,
              documentType: doc.documentType,
              fileName: doc.fileName,
              fieldType: f.fieldType,
              result: f.result,
              isCritical: f.isCritical,
              matchedReferenceValue: f.matchedReferenceValue,
              ocrConfidence: f.ocrConfidence,
              explanation: f.explanation,
            });
          }
        }
      } catch {
        // Empty docs
      }
    }

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.RAW_VIEW_OPENED,
      visitId,
      actorId: user.id,
      actorRole: user.role,
    });

    return {
      visitHeader,
      alerts,
      interviewAnswersBySection,
      validatedDocumentFields,
    };
  }

  private static async assembleVisitHeader(visitId: string, department: string): Promise<WorkspaceVisitHeader> {
    const isDbUp = await checkDatabaseAvailability();
    if (isDbUp) {
      try {
        const profile = await prisma.patientVisitProfile.findUnique({
          where: { visit_id: visitId },
          include: { patient: true },
        });

        if (profile && profile.patient) {
          return {
            visitId,
            patientRegistrationNumber: profile.patient.hospital_registration_number,
            patientAge: profile.patient.age,
            patientGender: profile.patient.gender,
            preferredLanguage: profile.preferred_language,
            isCompanionAssisted: profile.is_companion_assisted,
            companionName: profile.companion_name,
            companionRelationship: profile.companion_relationship,
            department,
          };
        }
      } catch {
        // Fallback
      }
    }

    return {
      visitId,
      patientRegistrationNumber: `HRN-${visitId.substring(0, 6).toUpperCase()}`,
      patientAge: 45,
      patientGender: 'Male',
      preferredLanguage: 'en',
      isCompanionAssisted: false,
      department,
    };
  }
}
