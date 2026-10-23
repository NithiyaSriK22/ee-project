import crypto from 'node:crypto';
import { DoctorReviewRepository } from '../doctor-review.repository.js';
import { ReviewPolicyService } from '../review/review-policy.service.js';
import { StaffUserPayload } from '../../../types/auth.types.js';
import {
  ConfirmedRecordDTO,
  ConfirmedStatementDTO,
  DoctorReviewAuditEvents,
} from '../doctor-review.types.js';
import { AppError, NotFoundError, ForbiddenError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';
import { HospitalSystemPushService } from '../../record-output/index.js';

export class AmendmentService {
  /**
   * Creates an amendment to a confirmed clinical record.
   * Never edits in-place: Creates new version linking to superseded record with audited reason.
   */
  public static async amendRecord(
    recordId: string,
    doctor: StaffUserPayload,
    amendmentReason: string,
    statements: ConfirmedStatementDTO[],
    attestationAccepted: boolean,
    attestationVersion: string
  ): Promise<ConfirmedRecordDTO> {
    if (doctor.role !== 'DOCTOR' && doctor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only treating physicians can amend confirmed clinical records.');
    }

    if (!amendmentReason || amendmentReason.trim().length < 5) {
      throw new AppError(
        'A comprehensive clinical amendment reason is mandatory to amend a confirmed record.',
        400,
        ErrorCode.AMENDMENT_REASON_REQUIRED
      );
    }

    const previousRecord = await DoctorReviewRepository.getConfirmedRecordById(recordId);
    if (!previousRecord) {
      throw new NotFoundError(`Confirmed clinical record not found: ${recordId}`);
    }

    const policy = ReviewPolicyService.getActivePolicy();
    if (!attestationAccepted) {
      throw new AppError(
        'Physician attestation must be re-accepted to create a clinical amendment',
        400,
        ErrorCode.ATTESTATION_REQUIRED
      );
    }
    if (attestationVersion !== policy.attestationVersion) {
      throw new AppError(
        `Attestation version mismatch (expected '${policy.attestationVersion}', received '${attestationVersion}')`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const nextVersion = previousRecord.version + 1;

    const newRecord = await DoctorReviewRepository.createConfirmedRecord({
      id: crypto.randomUUID(),
      visitId: previousRecord.visitId,
      version: nextVersion,
      basedOnSummaryId: previousRecord.basedOnSummaryId,
      summaryVersion: previousRecord.summaryVersion,
      reviewPolicyVersion: policy.version,
      confirmedByDoctorId: doctor.id,
      confirmedByDoctorName: doctor.fullName,
      confirmedAt: new Date(),
      attestationVersion: policy.attestationVersion,
      attestationText: policy.attestationText,
      supersedesId: previousRecord.id,
      amendmentReason,
      statements: statements.map((s, idx) => ({
        ...s,
        order: s.order ?? idx,
      })),
      createdAt: new Date(),
    });

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.RECORD_AMENDED,
      visitId: previousRecord.visitId,
      actorId: doctor.id,
      actorRole: doctor.role,
      metadata: {
        previousRecordId: previousRecord.id,
        newRecordId: newRecord.id,
        previousVersion: previousRecord.version,
        newVersion: newRecord.version,
        amendmentReason,
      },
    });

    // Re-push amended version to hospital system (Section 4: Amendments re-push with the version)
    try {
      await HospitalSystemPushService.pushConfirmedRecord(newRecord, {
        visitId: previousRecord.visitId,
        patientId: previousRecord.visitId,
        actorId: doctor.id,
        actorRole: doctor.role,
      });
    } catch {
      // Non-blocking: hospital push failure never blocks amendment!
    }

    return newRecord;
  }

  public static async getConfirmedRecord(id: string): Promise<ConfirmedRecordDTO> {
    const record = await DoctorReviewRepository.getConfirmedRecordById(id);
    if (!record) {
      throw new NotFoundError(`Confirmed clinical record not found: ${id}`);
    }
    return record;
  }

  public static async getLatestConfirmedRecord(visitId: string): Promise<ConfirmedRecordDTO> {
    const record = await DoctorReviewRepository.getLatestConfirmedRecord(visitId);
    if (!record) {
      throw new NotFoundError(`No confirmed clinical record exists for visit: ${visitId}`);
    }
    return record;
  }

  public static async getVersions(visitId: string): Promise<ConfirmedRecordDTO[]> {
    return DoctorReviewRepository.getConfirmedRecordVersions(visitId);
  }
}
