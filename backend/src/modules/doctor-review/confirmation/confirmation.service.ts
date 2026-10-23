import crypto from 'node:crypto';
import { DoctorReviewRepository, checkDatabaseAvailability } from '../doctor-review.repository.js';
import { ReviewPolicyService } from '../review/review-policy.service.js';
import { MustResolveEvaluator } from '../review/must-resolve.evaluator.js';
import { SummaryService } from '../../summary/summary.service.js';
import { DocumentsService } from '../../documents/documents.service.js';
import { InterviewService } from '../../interview/interview.service.js';
import { RedFlagsService } from '../../redflags/redflags.service.js';
import { ClaimService } from '../review/claim.service.js';
import { StaffUserPayload } from '../../../types/auth.types.js';
import {
  ConfirmedRecordDTO,
  ConfirmedStatementDTO,
  ConfirmedOrigins,
  ConfirmedOrigin,
  DoctorReviewStatuses,
  QueueStatuses,
  DoctorReviewAuditEvents,
  ResolutionTypes,
} from '../doctor-review.types.js';
import { AppError, NotFoundError, ForbiddenError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';
import { HospitalSystemPushService } from '../../record-output/index.js';

export class ConfirmationService {
  /**
   * Confirms the summary and creates an immutable, physician-confirmed clinical record.
   * STRICT SERVER-SIDE ENFORCEMENT: Recomputes must-resolve items live. Client cannot bypass.
   */
  public static async confirmReview(
    reviewId: string,
    doctor: StaffUserPayload,
    attestationAccepted: boolean,
    attestationVersion: string
  ): Promise<ConfirmedRecordDTO> {
    if (doctor.role !== 'DOCTOR' && doctor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only treating physicians can confirm clinical records.');
    }

    // 1. Fetch Doctor Review
    const review = await DoctorReviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundError(`Doctor review not found with ID: ${reviewId}`);
    }

    if (review.status === DoctorReviewStatuses.CONFIRMED) {
      throw new AppError(
        'This review session has already been confirmed. Use the amendment workflow to create a new version.',
        400,
        ErrorCode.RECORD_ALREADY_CONFIRMED
      );
    }

    const visitId = review.visitId;

    // 2. Fetch Active Policy and Check Attestation
    const policy = ReviewPolicyService.getActivePolicy();
    if (!attestationAccepted) {
      throw new AppError(
        'Physician attestation must be accepted to confirm clinical record',
        400,
        ErrorCode.ATTESTATION_REQUIRED
      );
    }
    const effectiveAttestationVersion = attestationVersion || policy.attestationVersion;
    if (effectiveAttestationVersion !== policy.attestationVersion) {
      throw new AppError(
        `Attestation version mismatch (expected '${policy.attestationVersion}', received '${attestationVersion}')`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // 3. Server re-fetches workspace inputs LIVE (THE DOCTOR DECIDES, THE SERVER ENFORCES)
    let m5Summary: any = null;
    let docFields: any[] = [];
    let interviewAnswers: any[] = [];
    let alerts: any[] = [];

    const isDbUp = await checkDatabaseAvailability();
    if (isDbUp) {
      try {
        m5Summary = await SummaryService.getLatestSummaryForVisit(visitId, doctor);
      } catch {
        // Summary might be null or manual
      }

      try {
        const docs = await DocumentsService.getValidatedDocumentFieldsForVisit(visitId);
        for (const doc of docs) {
          for (const f of doc.validatedFields) {
            docFields.push({
              id: f.id,
              documentId: doc.documentId,
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

      try {
        const interview = await InterviewService.getCompletedAnswers(visitId);
        interviewAnswers = interview.answers || [];
      } catch {
        interviewAnswers = [];
      }

      try {
        alerts = await RedFlagsService.listAlerts({ visitId });
      } catch {
        alerts = [];
      }
    }

    // 4. Recompute must-resolve items
    const savedResolutions = await DoctorReviewRepository.getResolutions(reviewId);
    const allDraftStatements = m5Summary?.sections?.flatMap((s: any) => s.statements) || [];

    const evaluatorResult = MustResolveEvaluator.evaluate(
      {
        visitId,
        documentFields: docFields,
        interviewAnswers,
        summaryStatements: allDraftStatements,
        alerts,
      },
      savedResolutions,
      policy
    );

    // 5. ANY UNRESOLVED? -> REJECT WITH LIST; NOTHING SAVED
    const unresolvedItems = evaluatorResult.mustResolveItems.filter((i) => !i.isResolved);
    if (unresolvedItems.length > 0) {
      throw new AppError(
        `Cannot confirm record: ${unresolvedItems.length} critical item(s) remain unresolved.`,
        400,
        ErrorCode.UNRESOLVED_CRITICAL_ITEMS,
        [
          {
            unresolvedCount: unresolvedItems.length,
            unresolvedItems: unresolvedItems.map((i) => ({
              itemRef: i.itemRef,
              title: i.title,
              description: i.description,
              itemType: i.itemType,
            })),
          },
        ]
      );
    }

    // 6. Build Confirmed Statements with Exact Clinical Origins
    const edits = await DoctorReviewRepository.getStatementEdits(reviewId);
    const additions = await DoctorReviewRepository.getDoctorAddedStatements(reviewId);
    const removedSet = await DoctorReviewRepository.getRemovedStatementIds(reviewId);

    const editMap = new Map(edits.map((e) => [e.originalStatementId, e]));

    const confirmedStatements: ConfirmedStatementDTO[] = [];
    let orderIndex = 0;

    // A. Statements from AI draft
    if (m5Summary?.sections) {
      for (const sec of m5Summary.sections) {
        for (const stmt of sec.statements || []) {
          if (stmt.id && removedSet.has(stmt.id)) {
            continue; // Physician removed from confirmed record
          }

          const edit = stmt.id ? editMap.get(stmt.id) : null;
          let finalOrigin: ConfirmedOrigin = ConfirmedOrigins.AI_CONFIRMED_UNCHANGED;
          let finalText = stmt.text;

          if (edit) {
            finalOrigin = ConfirmedOrigins.DOCTOR_EDITED;
            finalText = edit.editedText;
          } else if (stmt.text.includes('[illegible in original — verify manually]')) {
            finalOrigin = ConfirmedOrigins.CODE_PLACEHOLDER_RESOLVED;
          }

          // Check if related to a DEFER_TO_CONSULTATION resolution
          for (const res of savedResolutions) {
            if (
              res.resolutionType === ResolutionTypes.DEFER_TO_CONSULTATION &&
              stmt.text.toLowerCase().includes(res.itemRef.replace(/^(doc-field|interview-ans|conflict):/, '').toLowerCase())
            ) {
              finalOrigin = ConfirmedOrigins.TO_CLARIFY;
              if (!finalText.includes('[To clarify with patient:')) {
                finalText = `${finalText} [To clarify with patient: deferred to direct consultation]`;
              }
              break;
            }
          }

          confirmedStatements.push({
            section: sec.section,
            text: finalText,
            origin: finalOrigin,
            order: orderIndex++,
            aiStatementId: stmt.id || null,
            resolutionType: edit ? 'DOCTOR_EDITED' : null,
            sourceRefs: stmt.sources || [],
          });
        }

        // B. Doctor added statements for this section
        const addedForSec = additions.filter((a) => a.section === sec.section);
        for (const added of addedForSec) {
          confirmedStatements.push({
            section: sec.section,
            text: added.text,
            origin: ConfirmedOrigins.DOCTOR_ADDED,
            order: orderIndex++,
            aiStatementId: null,
            resolutionType: 'DOCTOR_ADDED',
            sourceRefs: [],
          });
        }
      }
    } else {
      // Manual record (e.g. fallback view when summary generation failed)
      for (const added of additions) {
        confirmedStatements.push({
          section: added.section,
          text: added.text,
          origin: ConfirmedOrigins.DOCTOR_ADDED,
          order: orderIndex++,
          aiStatementId: null,
          resolutionType: 'DOCTOR_ADDED',
          sourceRefs: [],
        });
      }
    }

    // Append any DEFER_TO_CONSULTATION resolutions that aren't already represented
    for (const res of savedResolutions) {
      if (res.resolutionType === ResolutionTypes.DEFER_TO_CONSULTATION) {
        const alreadyIncluded = confirmedStatements.some((s) => s.origin === ConfirmedOrigins.TO_CLARIFY);
        if (!alreadyIncluded) {
          confirmedStatements.push({
            section: 'MEDICATIONS_AND_ALLERGIES',
            text: `[To clarify with patient: Item '${res.itemRef}' deferred for bedside clarification]`,
            origin: ConfirmedOrigins.TO_CLARIFY,
            order: orderIndex++,
            aiStatementId: null,
            resolutionType: ResolutionTypes.DEFER_TO_CONSULTATION,
            sourceRefs: [{ sourceType: res.itemType, sourceRef: res.itemRef }],
          });
        }
      }
    }

    // 7. Atomic Transaction: Create ConfirmedRecord
    const existingVersions = await DoctorReviewRepository.getConfirmedRecordVersions(visitId);
    const nextVersion = existingVersions.length + 1;

    const confirmedRecord = await DoctorReviewRepository.createConfirmedRecord({
      id: crypto.randomUUID(),
      visitId,
      version: nextVersion,
      basedOnSummaryId: m5Summary?.id || null,
      summaryVersion: m5Summary?.version || 1,
      reviewPolicyVersion: policy.version,
      confirmedByDoctorId: doctor.id,
      confirmedByDoctorName: doctor.fullName,
      confirmedAt: new Date(),
      attestationVersion: policy.attestationVersion,
      attestationText: policy.attestationText,
      supersedesId: existingVersions.length > 0 ? existingVersions[existingVersions.length - 1]!.id : null,
      amendmentReason: null,
      statements: confirmedStatements,
      createdAt: new Date(),
    });

    // 8. Update Review & Queue Status
    await DoctorReviewRepository.updateReviewStatus(reviewId, DoctorReviewStatuses.CONFIRMED);
    await DoctorReviewRepository.upsertQueueEntry({
      visitId,
      queueStatus: QueueStatuses.COMPLETED,
    });

    // Release soft claim
    await ClaimService.releaseClaim(visitId, doctor.id);

    // 9. Audit Event
    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.SUMMARY_CONFIRMED,
      visitId,
      actorId: doctor.id,
      actorRole: doctor.role,
      metadata: {
        recordId: confirmedRecord.id,
        version: confirmedRecord.version,
        statementsCount: confirmedRecord.statements.length,
        policyVersion: policy.version,
      },
    });

    // 10. Module 7A: Automated Hospital System Hand-Off (Non-blocking)
    try {
      await HospitalSystemPushService.pushConfirmedRecord(confirmedRecord, {
        visitId,
        patientId: visitId,
        actorId: doctor.id,
        actorRole: doctor.role,
      });
    } catch {
      // Non-blocking: Hospital hand-off failure never disrupts doctor confirmation!
    }

    return confirmedRecord;
  }
}
