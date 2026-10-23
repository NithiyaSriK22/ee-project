import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../utils/response.util.js';
import { AppRequest } from '../../types/api.types.js';
import { DoctorReviewRepository } from '../doctor-review/doctor-review.repository.js';
import { ProvenanceHeaderBuilder } from './provenance-header.builder.js';
import { PdfExportService } from './services/pdf-export.service.js';
import { CopyBlocksService } from './services/copy-blocks.service.js';
import { StructuredJsonService } from './services/structured-json.service.js';
import { FhirR4MapperService } from './services/fhir-r4-mapper.service.js';
import { PatientCopyService } from './services/patient-copy.service.js';
import { HospitalSystemPushService } from './services/hospital-system-push.service.js';
import { AuditService } from '../admin/audit/audit.service.js';
import { AppError } from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { VisitService } from '../visit-lifecycle/visit.service.js';
import { IdentitySafetyService } from '../visit-lifecycle/identity-safety.service.js';

export class RecordOutputController {
  /**
   * Helper to retrieve confirmed record and ensure drafts are strictly refused.
   */
  private static async getVerifiedConfirmedRecord(recordId: string) {
    const record = await DoctorReviewRepository.getConfirmedRecordById(recordId);
    if (!record) {
      throw new AppError(
        `Confirmed record '${recordId}' not found. Drafts and unconfirmed summaries are strictly refused.`,
        404,
        ErrorCode.RECORD_NOT_CONFIRMED
      );
    }
    return record;
  }

  /**
   * Helper to resolve visit metadata (patient token, provisional state, HRN).
   */
  private static async resolveVisitMetadata(visitId: string) {
    try {
      const visit = VisitService.getVisitById(visitId);
      if (visit) {
        const patient = IdentitySafetyService.getPatientById(visit.patient_id);
        return {
          patientToken: visit.token_number || `TOKEN-${visitId.slice(0, 6)}`,
          isProvisionalIdentity: visit.identity_state === 'PROVISIONAL',
          hospitalRegistrationNumber: patient?.hospital_registration_number || null,
          patientId: visit.patient_id,
        };
      }
    } catch {
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

  public static async exportPdf(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = String(req.params.id || '');
      const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
      const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);

      const requestingUser = req.user
        ? { id: req.user.id, role: req.user.role, fullName: req.user.fullName }
        : { id: record.confirmedByDoctorId, role: 'DOCTOR', fullName: record.confirmedByDoctorName || 'Dr. Treating Physician' };

      const excludeSensitive = req.query.excludeSensitive === 'true';

      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record,
        patientToken: meta.patientToken,
        isProvisionalIdentity: meta.isProvisionalIdentity,
        hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
      });

      const pdfResult = PdfExportService.generatePrintableDocument({
        record,
        provenance,
        requestingUser,
        excludeSensitiveItems: excludeSensitive,
      });

      // Audit Export (Module 9)
      await AuditService.recordAudit({
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
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 2. COPY BLOCKS EXPORT
  // ==========================================

  public static async exportCopyBlocks(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = String(req.params.id || '');
      const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
      const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);

      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record,
        patientToken: meta.patientToken,
        isProvisionalIdentity: meta.isProvisionalIdentity,
        hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
      });

      const copyBlocks = CopyBlocksService.generateCopyBlocks(record, provenance);

      await AuditService.recordAudit({
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

      ResponseUtil.success(res, copyBlocks, 'Copy blocks generated for EHR paste-in');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 3. STRUCTURED JSON EXPORT
  // ==========================================

  public static async exportStructuredJson(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = String(req.params.id || '');
      const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
      const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);
      const excludeSensitive = req.query.excludeSensitive === 'true';

      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record,
        patientToken: meta.patientToken,
        isProvisionalIdentity: meta.isProvisionalIdentity,
        hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
      });

      const jsonPayload = StructuredJsonService.generateStructuredJson({
        record,
        provenance,
        visitId: record.visitId,
        patientId: meta.patientId,
        excludeSensitiveItems: excludeSensitive,
      });

      await AuditService.recordAudit({
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

      ResponseUtil.success(res, jsonPayload, 'Structured JSON record exported successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 4. FHIR R4 BUNDLE EXPORT (OPTIONAL)
  // ==========================================

  public static async exportFhirR4(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = String(req.params.id || '');
      const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
      const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);

      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record,
        patientToken: meta.patientToken,
        isProvisionalIdentity: meta.isProvisionalIdentity,
        hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
      });

      const fhirBundle = FhirR4MapperService.mapToFhirR4Bundle(record, provenance);

      await AuditService.recordAudit({
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

      ResponseUtil.success(res, fhirBundle, 'FHIR R4 bundle mapped successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 5. HOSPITAL SYSTEM HAND-OFF / PUSH
  // ==========================================

  public static async pushToHospital(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = String(req.params.id || '');
      const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
      const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);

      const pushResult = await HospitalSystemPushService.pushConfirmedRecord(record, {
        visitId: record.visitId,
        patientId: req.body.patientId || meta.patientId,
        hospitalRegistrationNumber: req.body.hospitalRegistrationNumber || meta.hospitalRegistrationNumber,
        identityState: req.body.identityState || (meta.isProvisionalIdentity ? 'PROVISIONAL' : 'CONFIRMED'),
        actorId: req.user?.id || record.confirmedByDoctorId,
        actorRole: req.user?.role || 'DOCTOR',
      });

      await AuditService.recordAudit({
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

      ResponseUtil.success(res, pushResult, 'Hospital push hand-off evaluated');
    } catch (err) {
      next(err);
    }
  }

  public static getFailureQueue(_req: Request, res: Response): void {
    const queue = HospitalSystemPushService.getFailureQueue();
    ResponseUtil.success(res, queue, 'Hospital failure queue retrieved');
  }

  public static async retryFailureQueueItem(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { queueId } = req.params;
      const queue = HospitalSystemPushService.getFailureQueue();
      const item = queue.find((q) => q.queueId === queueId);
      if (!item) {
        throw new AppError(`Failure queue item '${queueId}' not found.`, 404, ErrorCode.NOT_FOUND);
      }

      const record = await RecordOutputController.getVerifiedConfirmedRecord(item.recordId);
      const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);

      const result = await HospitalSystemPushService.retryFailedItem(String(queueId), record, {
        visitId: record.visitId,
        patientId: meta.patientId,
        hospitalRegistrationNumber: meta.hospitalRegistrationNumber,
        identityState: item.identityState,
        actorId: req.user?.id,
        actorRole: req.user?.role,
      });

      ResponseUtil.success(res, result, 'Failure queue item retried');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 6. PATIENT COPY (OPTIONAL, HUMAN DECISION)
  // ==========================================

  public static async generatePatientCopyLink(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = String(req.params.id || '');
      const record = await RecordOutputController.getVerifiedConfirmedRecord(recordId);
      const meta = await RecordOutputController.resolveVisitMetadata(record.visitId);

      const result = PatientCopyService.generatePatientCopy({
        record,
        patientId: req.body.patientId || meta.patientId,
        patientToken: meta.patientToken,
        patientConsentVerified: Boolean(req.body.patientConsentVerified),
        baseUrl: req.body.baseUrl,
      });

      await AuditService.recordAudit({
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

      ResponseUtil.success(res, result, 'Patient copy link generated successfully (expires in 15 minutes)');
    } catch (err) {
      next(err);
    }
  }

  public static async downloadPatientCopy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token || '');
      const claims = PatientCopyService.verifySignedToken(token);

      const record = await RecordOutputController.getVerifiedConfirmedRecord(claims.recordId);
      const meta = await RecordOutputController.resolveVisitMetadata(claims.visitId);

      const result = PatientCopyService.generatePatientCopy({
        record,
        patientId: claims.patientId,
        patientToken: meta.patientToken,
        patientConsentVerified: true,
      });

      await AuditService.recordAudit({
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
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Visit_Summary_${claims.visitId}_v${record.version}.txt"`
      );
      res.status(200).send(result.plainLanguageText);
    } catch (err) {
      next(err);
    }
  }
}
