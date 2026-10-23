"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const doctor_review_repository_js_1 = require("../doctor-review.repository.js");
const claim_service_js_1 = require("./claim.service.js");
const summary_service_js_1 = require("../../summary/summary.service.js");
const doctor_review_types_js_1 = require("../doctor-review.types.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
class ReviewService {
    /**
     * Initializes or resumes a doctor review session for a visit
     */
    static async startReview(visitId, doctor, options) {
        if (doctor.role !== 'DOCTOR' && doctor.role !== 'SUPER_ADMIN') {
            throw new app_error_js_1.ForbiddenError('Only treating physicians can conduct clinical case reviews.');
        }
        // Check soft claim
        await claim_service_js_1.ClaimService.claimVisit(visitId, doctor.id, doctor.fullName);
        // Fetch queue entry for department check
        const queueEntry = await doctor_review_repository_js_1.DoctorReviewRepository.getQueueEntry(visitId);
        const isDifferentDept = (d1, d2) => {
            if (!d1 || !d2)
                return false;
            const c1 = d1.toLowerCase().replace(/_/g, ' ').replace(/^(department of\s*|opd\s*)/i, '').trim();
            const c2 = d2.toLowerCase().replace(/_/g, ' ').replace(/^(department of\s*|opd\s*)/i, '').trim();
            return c1 !== c2 && !c1.includes(c2) && !c2.includes(c1);
        };
        if (queueEntry &&
            doctor.hospitalDepartment &&
            queueEntry.department &&
            isDifferentDept(doctor.hospitalDepartment, queueEntry.department)) {
            if (!options?.outOfQueueReason) {
                throw new app_error_js_1.ForbiddenError(`Out-of-department case review requires a typed justification reason (Case dept: ${queueEntry.department}).`);
            }
            await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
                action: doctor_review_types_js_1.DoctorReviewAuditEvents.OUT_OF_QUEUE_ACCESS,
                visitId,
                actorId: doctor.id,
                actorRole: doctor.role,
                metadata: {
                    doctorDepartment: doctor.hospitalDepartment,
                    caseDepartment: queueEntry.department,
                    reason: options.outOfQueueReason,
                },
            });
        }
        // Find active review or latest summary draft
        let review = await doctor_review_repository_js_1.DoctorReviewRepository.getActiveReviewByVisitId(visitId);
        if (!review) {
            let latestSummary = null;
            try {
                latestSummary = await summary_service_js_1.SummaryService.getLatestSummaryForVisit(visitId, doctor);
            }
            catch {
                // Fallback or missing summary allowed
            }
            const createdReview = await doctor_review_repository_js_1.DoctorReviewRepository.createReview({
                visitId,
                baseSummaryId: latestSummary?.id || null,
                baseSummaryVersion: latestSummary?.version || 1,
                doctorId: doctor.id,
            });
            review = createdReview;
            await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
                action: doctor_review_types_js_1.DoctorReviewAuditEvents.REVIEW_STARTED,
                visitId,
                actorId: doctor.id,
                actorRole: doctor.role,
                metadata: { reviewId: createdReview.id, summaryVersion: createdReview.baseSummaryVersion },
            });
        }
        return review;
    }
    /**
     * Submits an explicit resolution for a must-resolve item
     */
    static async saveResolution(reviewId, data, doctor) {
        const review = await doctor_review_repository_js_1.DoctorReviewRepository.getReviewById(reviewId);
        if (!review) {
            throw new app_error_js_1.NotFoundError(`Doctor review not found: ${reviewId}`);
        }
        if (review.status !== doctor_review_types_js_1.DoctorReviewStatuses.IN_REVIEW) {
            throw new app_error_js_1.AppError(`Cannot record resolutions on a review that is ${review.status.toLowerCase()}`, 400, error_codes_js_1.ErrorCode.RECORD_ALREADY_CONFIRMED);
        }
        const resolution = await doctor_review_repository_js_1.DoctorReviewRepository.saveResolution({
            reviewId,
            itemRef: data.itemRef,
            itemType: data.itemType,
            resolutionType: data.resolutionType,
            correctedValue: data.correctedValue || null,
            sourceHash: data.sourceHash || null,
            viewedSource: data.viewedSource ?? false,
            doctorId: doctor.id,
            resolvedAt: new Date(),
        });
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.ITEM_RESOLVED,
            visitId: review.visitId,
            actorId: doctor.id,
            actorRole: doctor.role,
            metadata: {
                reviewId,
                itemRef: data.itemRef,
                resolutionType: data.resolutionType,
                viewedSource: data.viewedSource,
            },
        });
        return resolution;
    }
    /**
     * Records a physician edit for a summary statement. Draft remains untouched.
     */
    static async editStatement(reviewId, statementId, editedText, previousTextRef, doctor) {
        const review = await doctor_review_repository_js_1.DoctorReviewRepository.getReviewById(reviewId);
        if (!review) {
            throw new app_error_js_1.NotFoundError(`Doctor review not found: ${reviewId}`);
        }
        if (review.status !== doctor_review_types_js_1.DoctorReviewStatuses.IN_REVIEW) {
            throw new app_error_js_1.AppError(`Cannot edit statements on a review that is ${review.status.toLowerCase()}`, 400, error_codes_js_1.ErrorCode.RECORD_ALREADY_CONFIRMED);
        }
        const edit = await doctor_review_repository_js_1.DoctorReviewRepository.saveStatementEdit({
            reviewId,
            originalStatementId: statementId,
            editedText,
            previousTextRef: previousTextRef || null,
            doctorId: doctor.id,
            createdAt: new Date(),
        });
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.STATEMENT_EDITED,
            visitId: review.visitId,
            actorId: doctor.id,
            actorRole: doctor.role,
            metadata: { reviewId, statementId },
        });
        return edit;
    }
    /**
     * Adds a physician statement directly into a section
     */
    static async addDoctorStatement(reviewId, section, text, order, doctor) {
        const review = await doctor_review_repository_js_1.DoctorReviewRepository.getReviewById(reviewId);
        if (!review) {
            throw new app_error_js_1.NotFoundError(`Doctor review not found: ${reviewId}`);
        }
        if (review.status !== doctor_review_types_js_1.DoctorReviewStatuses.IN_REVIEW) {
            throw new app_error_js_1.AppError(`Cannot add statements to a review that is ${review.status.toLowerCase()}`, 400, error_codes_js_1.ErrorCode.RECORD_ALREADY_CONFIRMED);
        }
        const stmt = await doctor_review_repository_js_1.DoctorReviewRepository.addDoctorStatement({
            reviewId,
            section,
            text,
            order,
            doctorId: doctor.id,
            createdAt: new Date(),
        });
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.STATEMENT_ADDED,
            visitId: review.visitId,
            actorId: doctor.id,
            actorRole: doctor.role,
            metadata: { reviewId, section },
        });
        return stmt;
    }
    /**
     * Excludes a draft statement from the physician-confirmed record
     */
    static async removeStatement(reviewId, statementId, doctor) {
        const review = await doctor_review_repository_js_1.DoctorReviewRepository.getReviewById(reviewId);
        if (!review) {
            throw new app_error_js_1.NotFoundError(`Doctor review not found: ${reviewId}`);
        }
        await doctor_review_repository_js_1.DoctorReviewRepository.removeStatement(reviewId, statementId);
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.STATEMENT_REMOVED,
            visitId: review.visitId,
            actorId: doctor.id,
            actorRole: doctor.role,
            metadata: { reviewId, statementId },
        });
        return { removed: true };
    }
    /**
     * Explicitly rejects an AI draft with controlled reason
     */
    static async rejectDraft(reviewId, reason, note, doctor) {
        const review = await doctor_review_repository_js_1.DoctorReviewRepository.getReviewById(reviewId);
        if (!review) {
            throw new app_error_js_1.NotFoundError(`Doctor review not found: ${reviewId}`);
        }
        const updated = await doctor_review_repository_js_1.DoctorReviewRepository.updateReviewStatus(reviewId, doctor_review_types_js_1.DoctorReviewStatuses.REJECTED, { reason, note });
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.SUMMARY_REJECTED,
            visitId: review.visitId,
            actorId: doctor.id,
            actorRole: doctor.role,
            metadata: { reviewId, reason },
        });
        return updated;
    }
    /**
     * Requests Module 5 summary regeneration
     */
    static async requestRegeneration(reviewId, reason, doctor) {
        const review = await doctor_review_repository_js_1.DoctorReviewRepository.getReviewById(reviewId);
        if (!review) {
            throw new app_error_js_1.NotFoundError(`Doctor review not found: ${reviewId}`);
        }
        // Call Module 5 regeneration
        const newSummary = await summary_service_js_1.SummaryService.generateSummaryForVisit(review.visitId, {
            forceRegenerate: true,
            triggeredBy: doctor.id,
        });
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.REGENERATION_REQUESTED,
            visitId: review.visitId,
            actorId: doctor.id,
            actorRole: doctor.role,
            metadata: {
                reviewId,
                previousVersion: review.baseSummaryVersion,
                newVersion: newSummary.version,
                reason: reason || null,
            },
        });
        return newSummary;
    }
}
exports.ReviewService = ReviewService;
