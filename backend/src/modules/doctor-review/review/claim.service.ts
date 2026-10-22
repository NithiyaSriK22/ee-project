import { DoctorReviewRepository } from '../doctor-review.repository.js';
import { ReviewClaimDTO, DoctorReviewAuditEvents } from '../doctor-review.types.js';
import { AppError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';

export class ClaimService {
  private static readonly CLAIM_TTL_MS = 15 * 60 * 1000; // 15 minutes soft lock

  /**
   * Attempts to claim a visit. If claimed by another unexpired doctor, rejects unless forceTakeover with reason provided.
   */
  public static async claimVisit(
    visitId: string,
    doctorId: string,
    doctorName: string,
    forceTakeover?: boolean,
    takeoverReason?: string
  ): Promise<ReviewClaimDTO> {
    const existingClaim = await DoctorReviewRepository.getClaim(visitId);

    if (existingClaim && existingClaim.claimedByDoctorId !== doctorId) {
      if (!forceTakeover) {
        throw new AppError(
          `Case is currently being reviewed by ${existingClaim.claimedByDoctorName || 'another doctor'}. You can view read-only or take over review.`,
          409,
          ErrorCode.REVIEW_CLAIMED_BY_OTHER,
          [
            {
              claimedByDoctorId: existingClaim.claimedByDoctorId,
              claimedByDoctorName: existingClaim.claimedByDoctorName,
              claimedAt: existingClaim.claimedAt,
              expiresAt: existingClaim.expiresAt,
            },
          ]
        );
      }

      if (!takeoverReason || takeoverReason.trim().length === 0) {
        throw new AppError(
          'A clinical reason is required to take over an active review from another physician.',
          400,
          ErrorCode.VALIDATION_ERROR
        );
      }

      // Record takeover audit
      await DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.REVIEW_TAKEN_OVER,
        visitId,
        actorId: doctorId,
        metadata: {
          previousDoctorId: existingClaim.claimedByDoctorId,
          takeoverReason,
        },
      });
    }

    return DoctorReviewRepository.setClaim(visitId, doctorId, doctorName, this.CLAIM_TTL_MS);
  }

  public static async getClaim(visitId: string): Promise<ReviewClaimDTO | null> {
    return DoctorReviewRepository.getClaim(visitId);
  }

  public static async releaseClaim(visitId: string, doctorId?: string): Promise<boolean> {
    return DoctorReviewRepository.releaseClaim(visitId, doctorId);
  }
}
