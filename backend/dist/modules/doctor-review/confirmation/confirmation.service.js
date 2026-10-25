"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const doctor_review_repository_js_1 = require("../doctor-review.repository.js");
const review_policy_service_js_1 = require("../review/review-policy.service.js");
const must_resolve_evaluator_js_1 = require("../review/must-resolve.evaluator.js");
const summary_service_js_1 = require("../../summary/summary.service.js");
const documents_service_js_1 = require("../../documents/documents.service.js");
const interview_service_js_1 = require("../../interview/interview.service.js");
const redflags_service_js_1 = require("../../redflags/redflags.service.js");
const claim_service_js_1 = require("../review/claim.service.js");
const doctor_review_types_js_1 = require("../doctor-review.types.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
const index_js_1 = require("../../record-output/index.js");
class ConfirmationService {
    /**
     * Confirms the summary and creates an immutable, physician-confirmed clinical record.
     * STRICT SERVER-SIDE ENFORCEMENT: Recomputes must-resolve items live. Client cannot bypass.
     */
    static async confirmReview(reviewId, doctor, attestationAccepted, attestationVersion) {
        if (doctor.role !== 'DOCTOR' && doctor.role !== 'SUPER_ADMIN') {
            throw new app_error_js_1.ForbiddenError('Only treating physicians can confirm clinical records.');
        }
        // 1. Fetch Doctor Review
        const review = await doctor_review_repository_js_1.DoctorReviewRepository.getReviewById(reviewId);
        if (!review) {
            throw new app_error_js_1.NotFoundError(`Doctor review not found with ID: ${reviewId}`);
        }
        if (review.status === doctor_review_types_js_1.DoctorReviewStatuses.CONFIRMED) {
            throw new app_error_js_1.AppError('This review session has already been confirmed. Use the amendment workflow to create a new version.', 400, error_codes_js_1.ErrorCode.RECORD_ALREADY_CONFIRMED);
        }
        const visitId = review.visitId;
        // 2. Fetch Active Policy and Check Attestation
        const policy = review_policy_service_js_1.ReviewPolicyService.getActivePolicy();
        if (!attestationAccepted) {
            throw new app_error_js_1.AppError('Physician attestation must be accepted to confirm clinical record', 400, error_codes_js_1.ErrorCode.ATTESTATION_REQUIRED);
        }
        const effectiveAttestationVersion = attestationVersion || policy.attestationVersion;
        if (effectiveAttestationVersion !== policy.attestationVersion) {
            throw new app_error_js_1.AppError(`Attestation version mismatch (expected '${policy.attestationVersion}', received '${attestationVersion}')`, 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR);
        }
        // 3. Server re-fetches workspace inputs LIVE (THE DOCTOR DECIDES, THE SERVER ENFORCES)
        let m5Summary = null;
        let docFields = [];
        let interviewAnswers = [];
        let alerts = [];
        const isDbUp = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDbUp) {
            try {
                m5Summary = await summary_service_js_1.SummaryService.getLatestSummaryForVisit(visitId, doctor);
            }
            catch {
                // Summary might be null or manual
            }
            try {
                const docs = await documents_service_js_1.DocumentsService.getValidatedDocumentFieldsForVisit(visitId);
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
                            rawText: f.rawText,
                            sourceSnippetRef: f.sourceSnippetRef,
                        });
                    }
                }
            }
            catch {
                docFields = [];
            }
            try {
                const interview = await interview_service_js_1.InterviewService.getCompletedAnswers(visitId);
                interviewAnswers = interview.answers || [];
            }
            catch {
                interviewAnswers = [];
            }
            try {
                alerts = await redflags_service_js_1.RedFlagsService.listAlerts({ visitId });
            }
            catch {
                alerts = [];
            }
        }
        // 4. Recompute must-resolve items
        const savedResolutions = await doctor_review_repository_js_1.DoctorReviewRepository.getResolutions(reviewId);
        const allDraftStatements = m5Summary?.sections?.flatMap((s) => s.statements) || [];
        const evaluatorResult = must_resolve_evaluator_js_1.MustResolveEvaluator.evaluate({
            visitId,
            documentFields: docFields,
            interviewAnswers,
            summaryStatements: allDraftStatements,
            alerts,
        }, savedResolutions, policy);
        // 5. ANY UNRESOLVED? -> REJECT WITH LIST; NOTHING SAVED
        const unresolvedItems = evaluatorResult.mustResolveItems.filter((i) => !i.isResolved);
        if (unresolvedItems.length > 0) {
            throw new app_error_js_1.AppError(`Cannot confirm record: ${unresolvedItems.length} critical item(s) remain unresolved.`, 400, error_codes_js_1.ErrorCode.UNRESOLVED_CRITICAL_ITEMS, [
                {
                    unresolvedCount: unresolvedItems.length,
                    unresolvedItems: unresolvedItems.map((i) => ({
                        itemRef: i.itemRef,
                        title: i.title,
                        description: i.description,
                        itemType: i.itemType,
                    })),
                },
            ]);
        }
        // 6. Build Confirmed Statements with Exact Clinical Origins
        const edits = await doctor_review_repository_js_1.DoctorReviewRepository.getStatementEdits(reviewId);
        const additions = await doctor_review_repository_js_1.DoctorReviewRepository.getDoctorAddedStatements(reviewId);
        const removedSet = await doctor_review_repository_js_1.DoctorReviewRepository.getRemovedStatementIds(reviewId);
        const editMap = new Map(edits.map((e) => [e.originalStatementId, e]));
        const confirmedStatements = [];
        let orderIndex = 0;
        // A. Statements from AI draft
        if (m5Summary?.sections) {
            for (const sec of m5Summary.sections) {
                for (const stmt of sec.statements || []) {
                    if (stmt.id && removedSet.has(stmt.id)) {
                        continue; // Physician removed from confirmed record
                    }
                    const edit = stmt.id ? editMap.get(stmt.id) : null;
                    let finalOrigin = doctor_review_types_js_1.ConfirmedOrigins.AI_CONFIRMED_UNCHANGED;
                    let finalText = stmt.text;
                    if (edit) {
                        finalOrigin = doctor_review_types_js_1.ConfirmedOrigins.DOCTOR_EDITED;
                        finalText = edit.editedText;
                    }
                    else if (stmt.text.includes('[illegible in original — verify manually]')) {
                        finalOrigin = doctor_review_types_js_1.ConfirmedOrigins.CODE_PLACEHOLDER_RESOLVED;
                    }
                    // Check if related to a DEFER_TO_CONSULTATION resolution
                    for (const res of savedResolutions) {
                        if (res.resolutionType === doctor_review_types_js_1.ResolutionTypes.DEFER_TO_CONSULTATION &&
                            stmt.text.toLowerCase().includes(res.itemRef.replace(/^(doc-field|interview-ans|conflict):/, '').toLowerCase())) {
                            finalOrigin = doctor_review_types_js_1.ConfirmedOrigins.TO_CLARIFY;
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
                        origin: doctor_review_types_js_1.ConfirmedOrigins.DOCTOR_ADDED,
                        order: orderIndex++,
                        aiStatementId: null,
                        resolutionType: 'DOCTOR_ADDED',
                        sourceRefs: [],
                    });
                }
            }
        }
        else {
            // Manual record (e.g. fallback view when summary generation failed)
            for (const added of additions) {
                confirmedStatements.push({
                    section: added.section,
                    text: added.text,
                    origin: doctor_review_types_js_1.ConfirmedOrigins.DOCTOR_ADDED,
                    order: orderIndex++,
                    aiStatementId: null,
                    resolutionType: 'DOCTOR_ADDED',
                    sourceRefs: [],
                });
            }
        }
        // Append any DEFER_TO_CONSULTATION resolutions that aren't already represented
        for (const res of savedResolutions) {
            if (res.resolutionType === doctor_review_types_js_1.ResolutionTypes.DEFER_TO_CONSULTATION) {
                const alreadyIncluded = confirmedStatements.some((s) => s.origin === doctor_review_types_js_1.ConfirmedOrigins.TO_CLARIFY);
                if (!alreadyIncluded) {
                    confirmedStatements.push({
                        section: 'MEDICATIONS_AND_ALLERGIES',
                        text: `[To clarify with patient: Item '${res.itemRef}' deferred for bedside clarification]`,
                        origin: doctor_review_types_js_1.ConfirmedOrigins.TO_CLARIFY,
                        order: orderIndex++,
                        aiStatementId: null,
                        resolutionType: doctor_review_types_js_1.ResolutionTypes.DEFER_TO_CONSULTATION,
                        sourceRefs: [{ sourceType: res.itemType, sourceRef: res.itemRef }],
                    });
                }
            }
        }
        // 7. Atomic Transaction: Create ConfirmedRecord
        const existingVersions = await doctor_review_repository_js_1.DoctorReviewRepository.getConfirmedRecordVersions(visitId);
        const nextVersion = existingVersions.length + 1;
        const confirmedRecord = await doctor_review_repository_js_1.DoctorReviewRepository.createConfirmedRecord({
            id: node_crypto_1.default.randomUUID(),
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
            supersedesId: existingVersions.length > 0 ? existingVersions[existingVersions.length - 1].id : null,
            amendmentReason: null,
            statements: confirmedStatements,
            createdAt: new Date(),
        });
        // 8. Update Review & Queue Status
        await doctor_review_repository_js_1.DoctorReviewRepository.updateReviewStatus(reviewId, doctor_review_types_js_1.DoctorReviewStatuses.CONFIRMED);
        await doctor_review_repository_js_1.DoctorReviewRepository.upsertQueueEntry({
            visitId,
            queueStatus: doctor_review_types_js_1.QueueStatuses.COMPLETED,
        });
        // Release soft claim
        await claim_service_js_1.ClaimService.releaseClaim(visitId, doctor.id);
        // 9. Audit Event
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.SUMMARY_CONFIRMED,
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
            await index_js_1.HospitalSystemPushService.pushConfirmedRecord(confirmedRecord, {
                visitId,
                patientId: visitId,
                actorId: doctor.id,
                actorRole: doctor.role,
            });
        }
        catch {
            // Non-blocking: Hospital hand-off failure never disrupts doctor confirmation!
        }
        return confirmedRecord;
    }
}
exports.ConfirmationService = ConfirmationService;
