import { DoctorReviewRepository } from '../doctor-review.repository.js';
import { ClaimService } from './claim.service.js';
import { SummaryService } from '../../summary/summary.service.js';
import { StaffUserPayload } from '../../../types/auth.types.js';
import {
  DoctorReviewStatuses,
  DoctorReviewAuditEvents,
  ReviewItemResolutionDTO,
  StatementEditDTO,
  DoctorAddedStatementDTO,
  RejectionReason,
} from '../doctor-review.types.js';
import { AppError, NotFoundError, ForbiddenError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';

export class ReviewService {
  /**
   * Initializes or resumes a doctor review session for a visit
   */
  public static async startReview(
    visitId: string,
    doctor: StaffUserPayload,
    options?: { outOfQueueReason?: string }
  ) {
    if (doctor.role !== 'DOCTOR' && doctor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only treating physicians can conduct clinical case reviews.');
    }

    // Check soft claim
    await ClaimService.claimVisit(visitId, doctor.id, doctor.fullName);

    // Fetch queue entry for department check
    const queueEntry = await DoctorReviewRepository.getQueueEntry(visitId);
    const isDifferentDept = (d1?: string | null, d2?: string | null): boolean => {
      if (!d1 || !d2) return false;
      const c1 = d1.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
      const c2 = d2.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
      return c1 !== c2 && !c1.includes(c2) && !c2.includes(c1);
    };

    if (
      queueEntry &&
      doctor.hospitalDepartment &&
      queueEntry.department &&
      isDifferentDept(doctor.hospitalDepartment, queueEntry.department)
    ) {
      if (!options?.outOfQueueReason) {
        throw new ForbiddenError(
          `Out-of-department case review requires a typed justification reason (Case dept: ${queueEntry.department}).`
        );
      }
      await DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.OUT_OF_QUEUE_ACCESS,
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
    let review = await DoctorReviewRepository.getActiveReviewByVisitId(visitId);

    if (!review) {
      let latestSummary = null;
      try {
        latestSummary = await SummaryService.getLatestSummaryForVisit(visitId, doctor);
      } catch {
        // Fallback or missing summary allowed
      }

      const createdReview = await DoctorReviewRepository.createReview({
        visitId,
        baseSummaryId: latestSummary?.id || null,
        baseSummaryVersion: latestSummary?.version || 1,
        doctorId: doctor.id,
      });
      review = createdReview;

      await DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.REVIEW_STARTED,
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
  public static async saveResolution(
    reviewId: string,
    data: Omit<ReviewItemResolutionDTO, 'reviewId' | 'doctorId' | 'resolvedAt'>,
    doctor: StaffUserPayload
  ): Promise<ReviewItemResolutionDTO> {
    const review = await DoctorReviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundError(`Doctor review not found: ${reviewId}`);
    }

    if (review.status !== DoctorReviewStatuses.IN_REVIEW) {
      throw new AppError(
        `Cannot record resolutions on a review that is ${review.status.toLowerCase()}`,
        400,
        ErrorCode.RECORD_ALREADY_CONFIRMED
      );
    }

    const resolution = await DoctorReviewRepository.saveResolution({
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

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.ITEM_RESOLVED,
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
  public static async editStatement(
    reviewId: string,
    statementId: string,
    editedText: string,
    previousTextRef: string | undefined,
    doctor: StaffUserPayload
  ): Promise<StatementEditDTO> {
    const review = await DoctorReviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundError(`Doctor review not found: ${reviewId}`);
    }

    if (review.status !== DoctorReviewStatuses.IN_REVIEW) {
      throw new AppError(
        `Cannot edit statements on a review that is ${review.status.toLowerCase()}`,
        400,
        ErrorCode.RECORD_ALREADY_CONFIRMED
      );
    }

    const edit = await DoctorReviewRepository.saveStatementEdit({
      reviewId,
      originalStatementId: statementId,
      editedText,
      previousTextRef: previousTextRef || null,
      doctorId: doctor.id,
      createdAt: new Date(),
    });

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.STATEMENT_EDITED,
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
  public static async addDoctorStatement(
    reviewId: string,
    section: string,
    text: string,
    order: number,
    doctor: StaffUserPayload
  ): Promise<DoctorAddedStatementDTO> {
    const review = await DoctorReviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundError(`Doctor review not found: ${reviewId}`);
    }

    if (review.status !== DoctorReviewStatuses.IN_REVIEW) {
      throw new AppError(
        `Cannot add statements to a review that is ${review.status.toLowerCase()}`,
        400,
        ErrorCode.RECORD_ALREADY_CONFIRMED
      );
    }

    const stmt = await DoctorReviewRepository.addDoctorStatement({
      reviewId,
      section,
      text,
      order,
      doctorId: doctor.id,
      createdAt: new Date(),
    });

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.STATEMENT_ADDED,
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
  public static async removeStatement(
    reviewId: string,
    statementId: string,
    doctor: StaffUserPayload
  ): Promise<{ removed: boolean }> {
    const review = await DoctorReviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundError(`Doctor review not found: ${reviewId}`);
    }

    await DoctorReviewRepository.removeStatement(reviewId, statementId);

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.STATEMENT_REMOVED,
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
  public static async rejectDraft(
    reviewId: string,
    reason: RejectionReason,
    note: string | undefined,
    doctor: StaffUserPayload
  ) {
    const review = await DoctorReviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundError(`Doctor review not found: ${reviewId}`);
    }

    const updated = await DoctorReviewRepository.updateReviewStatus(
      reviewId,
      DoctorReviewStatuses.REJECTED,
      { reason, note }
    );

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.SUMMARY_REJECTED,
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
  public static async requestRegeneration(
    reviewId: string,
    reason: string | undefined,
    doctor: StaffUserPayload
  ) {
    const review = await DoctorReviewRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundError(`Doctor review not found: ${reviewId}`);
    }

    // Call Module 5 regeneration
    const newSummary = await SummaryService.generateSummaryForVisit(review.visitId, {
      forceRegenerate: true,
      triggeredBy: doctor.id,
    });

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.REGENERATION_REQUESTED,
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
