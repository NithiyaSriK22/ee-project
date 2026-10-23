"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimService = void 0;
const doctor_review_repository_js_1 = require("../doctor-review.repository.js");
const doctor_review_types_js_1 = require("../doctor-review.types.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
class ClaimService {
    static CLAIM_TTL_MS = 15 * 60 * 1000; // 15 minutes soft lock
    /**
     * Attempts to claim a visit. If claimed by another unexpired doctor, rejects unless forceTakeover with reason provided.
     */
    static async claimVisit(visitId, doctorId, doctorName, forceTakeover, takeoverReason) {
        const existingClaim = await doctor_review_repository_js_1.DoctorReviewRepository.getClaim(visitId);
        if (existingClaim && existingClaim.claimedByDoctorId !== doctorId) {
            if (!forceTakeover) {
                throw new app_error_js_1.AppError(`Case is currently being reviewed by ${existingClaim.claimedByDoctorName || 'another doctor'}. You can view read-only or take over review.`, 409, error_codes_js_1.ErrorCode.REVIEW_CLAIMED_BY_OTHER, [
                    {
                        claimedByDoctorId: existingClaim.claimedByDoctorId,
                        claimedByDoctorName: existingClaim.claimedByDoctorName,
                        claimedAt: existingClaim.claimedAt,
                        expiresAt: existingClaim.expiresAt,
                    },
                ]);
            }
            if (!takeoverReason || takeoverReason.trim().length === 0) {
                throw new app_error_js_1.AppError('A clinical reason is required to take over an active review from another physician.', 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR);
            }
            // Record takeover audit
            await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
                action: doctor_review_types_js_1.DoctorReviewAuditEvents.REVIEW_TAKEN_OVER,
                visitId,
                actorId: doctorId,
                metadata: {
                    previousDoctorId: existingClaim.claimedByDoctorId,
                    takeoverReason,
                },
            });
        }
        return doctor_review_repository_js_1.DoctorReviewRepository.setClaim(visitId, doctorId, doctorName, this.CLAIM_TTL_MS);
    }
    static async getClaim(visitId) {
        return doctor_review_repository_js_1.DoctorReviewRepository.getClaim(visitId);
    }
    static async releaseClaim(visitId, doctorId) {
        return doctor_review_repository_js_1.DoctorReviewRepository.releaseClaim(visitId, doctorId);
    }
}
exports.ClaimService = ClaimService;
