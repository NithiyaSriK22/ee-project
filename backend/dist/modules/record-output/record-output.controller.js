"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordOutputController = void 0;
const response_util_js_1 = require("../../utils/response.util.js");
const doctor_review_repository_js_1 = require("../doctor-review/doctor-review.repository.js");
const provenance_header_builder_js_1 = require("./provenance-header.builder.js");
const pdf_export_service_js_1 = require("./services/pdf-export.service.js");
const copy_blocks_service_js_1 = require("./services/copy-blocks.service.js");
const structured_json_service_js_1 = require("./services/structured-json.service.js");
const fhir_r4_mapper_service_js_1 = require("./services/fhir-r4-mapper.service.js");
const patient_copy_service_js_1 = require("./services/patient-copy.service.js");
const hospital_system_push_service_js_1 = require("./services/hospital-system-push.service.js");
const audit_service_js_1 = require("../admin/audit/audit.service.js");
const app_error_js_1 = require("../../errors/app-error.js");
const error_codes_js_1 = require("../../errors/error-codes.js");
const visit_service_js_1 = require("../visit-lifecycle/visit.service.js");
const identity_safety_service_js_1 = require("../visit-lifecycle/identity-safety.service.js");
class RecordOutputController {
    /**
     * Helper to retrieve confirmed record and ensure drafts are strictly refused.
     */
    static async getVerifiedConfirmedRecord(recordId) {
        const record = await doctor_review_repository_js_1.DoctorReviewRepository.getConfirmedRecordById(recordId);
        if (!record) {
            throw new app_error_js_1.AppError(`Confirmed record '${recordId}' not found. Drafts and unconfirmed summaries are strictly refused.`, 404, error_codes_js_1.ErrorCode.RECORD_NOT_CONFIRMED);
        }
        return record;
    }
    /**
     * Helper to resolve visit metadata (patient token, provisional state, HRN).
     */
    static async resolveVisitMetadata(visitId) {
        try {
            const visit = visit_service_js_1.VisitService.getVisitById(visitId);
            if (visit) {
                const patient = identity_safety_service_js_1.IdentitySafetyService.getPatientById(visit.patient_id);
                return {
                    patientToken: visit.token_number || `TOKEN-${visitId.slice(0, 6)}`,
                    isProvisionalIdentity: visit.identity_state === 'PROVISIONAL',
                    hospitalRegistrationNumber: patient?.hospital_registration_number || null,
                    patientId: visit.patient_id,
                };
            }
        }
        catch {
            // Fallback in dev/mock environment
        }
        return {
            patientToken: `TOKEN-${visitId.slice(0, 8)}`,
            isProvisionalIdentity: false,
            hospitalRegistrationNumber: 'HRN-REC-2026',
            patientId: `PAT-${visitId.slice(0, 8)}`,
        };
    }
    // ==========================================
    // 1. PDF / PRINT EXPORT
    // ==========================================
    static async exportPdf(req, res, next) {
        try {
            const recordId = String(req.params.id || '');
            const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
            const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);
            const requestingUser = req.user
                ? { id: req.user.id, role: req.user.role, fullName: req.user.fullName }
                : { id: record.confirmedByDoctorId, role: 'DOCTOR', fullName: record.confirmedByDoctorName || 'Dr. Treating Physician' };
            const excludeSensitive = req.query.excludeSensitive === 'true';
            const provenance = provenance_header_builder_js_1.ProvenanceHeaderBuilder.buildProvenanceHeader({
                record,
                patientToken: meta.patientToken,
                isProvisionalIdentity: meta.isProvisionalIdentity,
                hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
            });
            const pdfResult = pdf_export_service_js_1.PdfExportService.generatePrintableDocument({
                record,
                provenance,
                requestingUser,
                excludeSensitiveItems: excludeSensitive,
            });
            // Audit Export (Module 9)
            await audit_service_js_1.AuditService.recordAudit({
                actorType: 'STAFF',
                actorId: requestingUser.id,
                actorRole: requestingUser.role,
                action: 'RECORD_PDF_EXPORTED',
                entityType: 'CONFIRMED_RECORD',
                entityId: record.id,
                visitRef: record.visitId,
                metadata: {
                    recordVersion: record.version,
                    fileName: pdfResult.fileName,
                    isProvisional: provenance.isProvisionalIdentity,
                },
            });
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `inline; filename="${pdfResult.fileName}"`);
            res.status(200).send(pdfResult.htmlContent);
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // 2. COPY BLOCKS EXPORT
    // ==========================================
    static async exportCopyBlocks(req, res, next) {
        try {
            const recordId = String(req.params.id || '');
            const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
            const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);
            const provenance = provenance_header_builder_js_1.ProvenanceHeaderBuilder.buildProvenanceHeader({
                record,
                patientToken: meta.patientToken,
                isProvisionalIdentity: meta.isProvisionalIdentity,
                hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
            });
            const copyBlocks = copy_blocks_service_js_1.CopyBlocksService.generateCopyBlocks(record, provenance);
            await audit_service_js_1.AuditService.recordAudit({
                actorType: 'STAFF',
                actorId: req.user?.id || record.confirmedByDoctorId,
                actorRole: req.user?.role || 'DOCTOR',
                action: 'RECORD_COPY_BLOCKS_GENERATED',
                entityType: 'CONFIRMED_RECORD',
                entityId: record.id,
                visitRef: record.visitId,
                metadata: {
                    recordVersion: record.version,
                    sectionsCount: Object.keys(copyBlocks.sections).length,
                },
            });
            response_util_js_1.ResponseUtil.success(res, copyBlocks, 'Copy blocks generated for EHR paste-in');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // 3. STRUCTURED JSON EXPORT
    // ==========================================
    static async exportStructuredJson(req, res, next) {
        try {
            const recordId = String(req.params.id || '');
            const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
            const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);
            const excludeSensitive = req.query.excludeSensitive === 'true';
            const provenance = provenance_header_builder_js_1.ProvenanceHeaderBuilder.buildProvenanceHeader({
                record,
                patientToken: meta.patientToken,
                isProvisionalIdentity: meta.isProvisionalIdentity,
                hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
            });
            const jsonPayload = structured_json_service_js_1.StructuredJsonService.generateStructuredJson({
                record,
                provenance,
                visitId: record.visitId,
                patientId: meta.patientId,
                excludeSensitiveItems: excludeSensitive,
            });
            await audit_service_js_1.AuditService.recordAudit({
                actorType: 'STAFF',
                actorId: req.user?.id || record.confirmedByDoctorId,
                actorRole: req.user?.role || 'DOCTOR',
                action: 'RECORD_JSON_EXPORTED',
                entityType: 'CONFIRMED_RECORD',
                entityId: record.id,
                visitRef: record.visitId,
                metadata: {
                    recordVersion: record.version,
                    schemaVersion: jsonPayload.schemaVersion,
                },
            });
            response_util_js_1.ResponseUtil.success(res, jsonPayload, 'Structured JSON record exported successfully');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // 4. FHIR R4 BUNDLE EXPORT (OPTIONAL)
    // ==========================================
    static async exportFhirR4(req, res, next) {
        try {
            const recordId = String(req.params.id || '');
            const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
            const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);
            const provenance = provenance_header_builder_js_1.ProvenanceHeaderBuilder.buildProvenanceHeader({
                record,
                patientToken: meta.patientToken,
                isProvisionalIdentity: meta.isProvisionalIdentity,
                hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
            });
            const fhirBundle = fhir_r4_mapper_service_js_1.FhirR4MapperService.mapToFhirR4Bundle(record, provenance);
            await audit_service_js_1.AuditService.recordAudit({
                actorType: 'STAFF',
                actorId: req.user?.id || record.confirmedByDoctorId,
                actorRole: req.user?.role || 'DOCTOR',
                action: 'RECORD_FHIR_EXPORTED',
                entityType: 'CONFIRMED_RECORD',
                entityId: record.id,
                visitRef: record.visitId,
                metadata: {
                    recordVersion: record.version,
                    fhirResourceType: fhirBundle.resourceType,
                    entryCount: fhirBundle.entry.length,
                },
            });
            response_util_js_1.ResponseUtil.success(res, fhirBundle, 'FHIR R4 bundle mapped successfully');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // 5. HOSPITAL SYSTEM HAND-OFF / PUSH
    // ==========================================
    static async pushToHospital(req, res, next) {
        try {
            const recordId = String(req.params.id || '');
            const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
            const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);
            const pushResult = await hospital_system_push_service_js_1.HospitalSystemPushService.pushConfirmedRecord(record, {
                visitId: record.visitId,
                patientId: req.body.patientId || meta.patientId,
                hospitalRegistrationNumber: req.body.hospitalRegistrationNumber || meta.hospitalRegistrationNumber,
                identityState: req.body.identityState || (meta.isProvisionalIdentity ? 'PROVISIONAL' : 'CONFIRMED'),
                actorId: req.user?.id || record.confirmedByDoctorId,
                actorRole: req.user?.role || 'DOCTOR',
            });
            await audit_service_js_1.AuditService.recordAudit({
                actorType: 'STAFF',
                actorId: req.user?.id || record.confirmedByDoctorId,
                actorRole: req.user?.role || 'DOCTOR',
                action: 'RECORD_PUSH_TO_HOSPITAL',
                entityType: 'CONFIRMED_RECORD',
                entityId: record.id,
                visitRef: record.visitId,
                metadata: {
                    success: pushResult.success,
                    adapterName: pushResult.adapterName,
                    idempotencyKey: pushResult.idempotencyKey,
                },
            });
            response_util_js_1.ResponseUtil.success(res, pushResult, 'Hospital push hand-off evaluated');
        }
        catch (err) {
            next(err);
        }
    }
    static getFailureQueue(_req, res) {
        const queue = hospital_system_push_service_js_1.HospitalSystemPushService.getFailureQueue();
        response_util_js_1.ResponseUtil.success(res, queue, 'Hospital failure queue retrieved');
    }
    static async retryFailureQueueItem(req, res, next) {
        try {
            const { queueId } = req.params;
            const queue = hospital_system_push_service_js_1.HospitalSystemPushService.getFailureQueue();
            const item = queue.find((q) => q.queueId === queueId);
            if (!item) {
                throw new app_error_js_1.AppError(`Failure queue item '${queueId}' not found.`, 404, error_codes_js_1.ErrorCode.NOT_FOUND);
            }
            const record = await RecordOutputController.getVerifiedConfirmedRecord(item.recordId);
            const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);
            const result = await hospital_system_push_service_js_1.HospitalSystemPushService.retryFailedItem(String(queueId), record, {
                visitId: record.visitId,
                patientId: meta.patientId,
                hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
                identityState: item.identityState,
                actorId: req.user?.id,
                actorRole: req.user?.role,
            });
            response_util_js_1.ResponseUtil.success(res, result, 'Failure queue item retried');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // 6. PATIENT COPY (OPTIONAL, HUMAN DECISION)
    // ==========================================
    static async generatePatientCopyLink(req, res, next) {
        try {
            const recordId = String(req.params.id || '');
            const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
            const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);
            const result = patient_copy_service_js_1.PatientCopyService.generatePatientCopy({
                record,
                patientId: req.body.patientId || meta.patientId,
                patientToken: meta.patientToken,
                patientConsentVerified: Boolean(req.body.patientConsentVerified),
                baseUrl: req.body.baseUrl,
            });
            await audit_service_js_1.AuditService.recordAudit({
                actorType: 'STAFF',
                actorId: req.user?.id || record.confirmedByDoctorId,
                actorRole: req.user?.role || 'DOCTOR',
                action: 'PATIENT_COPY_LINK_GENERATED',
                entityType: 'CONFIRMED_RECORD',
                entityId: record.id,
                visitRef: record.visitId,
                metadata: {
                    recordVersion: record.version,
                    expiresAt: result.expiresAt,
                },
            });
            response_util_js_1.ResponseUtil.success(res, result, 'Patient copy link generated successfully (expires in 15 minutes)');
        }
        catch (err) {
            next(err);
        }
    }
    static async downloadPatientCopy(req, res, next) {
        try {
            const token = String(req.params.token || '');
            const claims = patient_copy_service_js_1.PatientCopyService.verifySignedToken(token);
            const record = await RecordOutputController.getVerifiedConfirmedRecord(claims.recordId);
            const meta = await RecordOutputController.resolveVisitMetadata(claims.visitId);
            const result = patient_copy_service_js_1.PatientCopyService.generatePatientCopy({
                record,
                patientId: claims.patientId,
                patientToken: meta.patientToken,
                patientConsentVerified: true,
            });
            await audit_service_js_1.AuditService.recordAudit({
                actorType: 'SYSTEM',
                actorId: claims.patientId,
                actorRole: 'PATIENT',
                action: 'PATIENT_COPY_DOWNLOADED',
                entityType: 'CONFIRMED_RECORD',
                entityId: record.id,
                visitRef: claims.visitId,
                metadata: {
                    recordVersion: record.version,
                    accessedBy: 'PATIENT',
                },
            });
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="Visit_Summary_${claims.visitId}_v${record.version}.txt"`);
            res.status(200).send(result.plainLanguageText);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.RecordOutputController = RecordOutputController;
