"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmendmentService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const doctor_review_repository_js_1 = require("../doctor-review.repository.js");
const review_policy_service_js_1 = require("../review/review-policy.service.js");
const doctor_review_types_js_1 = require("../doctor-review.types.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
const index_js_1 = require("../../record-output/index.js");
class AmendmentService {
    /**
     * Creates an amendment to a confirmed clinical record.
     * Never edits in-place: Creates new version linking to superseded record with audited reason.
     */
    static async amendRecord(recordId, doctor, amendmentReason, statements, attestationAccepted, attestationVersion) {
        if (doctor.role !== 'DOCTOR' && doctor.role !== 'SUPER_ADMIN') {
            throw new app_error_js_1.ForbiddenError('Only treating physicians can amend confirmed clinical records.');
        }
        if (!amendmentReason || amendmentReason.trim().length < 5) {
            throw new app_error_js_1.AppError('A comprehensive clinical amendment reason is mandatory to amend a confirmed record.', 400, error_codes_js_1.ErrorCode.AMENDMENT_REASON_REQUIRED);
        }
        const previousRecord = await doctor_review_repository_js_1.DoctorReviewRepository.getConfirmedRecordById(recordId);
        if (!previousRecord) {
            throw new app_error_js_1.NotFoundError(`Confirmed clinical record not found: ${recordId}`);
        }
        const policy = review_policy_service_js_1.ReviewPolicyService.getActivePolicy();
        if (!attestationAccepted) {
            throw new app_error_js_1.AppError('Physician attestation must be re-accepted to create a clinical amendment', 400, error_codes_js_1.ErrorCode.ATTESTATION_REQUIRED);
        }
        if (attestationVersion !== policy.attestationVersion) {
            throw new app_error_js_1.AppError(`Attestation version mismatch (expected '${policy.attestationVersion}', received '${attestationVersion}')`, 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR);
        }
        const nextVersion = previousRecord.version + 1;
        const newRecord = await doctor_review_repository_js_1.DoctorReviewRepository.createConfirmedRecord({
            id: node_crypto_1.default.randomUUID(),
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
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.RECORD_AMENDED,
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
            await index_js_1.HospitalSystemPushService.pushConfirmedRecord(newRecord, {
                visitId: previousRecord.visitId,
                patientId: previousRecord.visitId,
                actorId: doctor.id,
                actorRole: doctor.role,
            });
        }
        catch {
            // Non-blocking: hospital push failure never blocks amendment!
        }
        return newRecord;
    }
    static async getConfirmedRecord(id) {
        const record = await doctor_review_repository_js_1.DoctorReviewRepository.getConfirmedRecordById(id);
        if (!record) {
            throw new app_error_js_1.NotFoundError(`Confirmed clinical record not found: ${id}`);
        }
        return record;
    }
    static async getLatestConfirmedRecord(visitId) {
        const record = await doctor_review_repository_js_1.DoctorReviewRepository.getLatestConfirmedRecord(visitId);
        if (!record) {
            throw new app_error_js_1.NotFoundError(`No confirmed clinical record exists for visit: ${visitId}`);
        }
        return record;
    }
    static async getVersions(visitId) {
        return doctor_review_repository_js_1.DoctorReviewRepository.getConfirmedRecordVersions(visitId);
    }
}
exports.AmendmentService = AmendmentService;
