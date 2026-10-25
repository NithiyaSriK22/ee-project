import path from 'node:path';
import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { QueueService } from './queue/queue.service.js';
import { WorkspaceService } from './workspace/workspace.service.js';
import { ReviewService } from './review/review.service.js';
import { ConfirmationService } from './confirmation/confirmation.service.js';
import { AmendmentService } from './confirmation/amendment.service.js';
import { DoctorReviewRepository } from './doctor-review.repository.js';
import { TokenUtil } from '../../utils/token.util.js';
import { DoctorReviewAuditEvents } from './doctor-review.types.js';
import { ForbiddenError, NotFoundError } from '../../errors/app-error.js';
import { DocumentsService } from '../documents/documents.service.js';
import { DocumentsRepository } from '../documents/documents.repository.js';
import { DocumentStorageService } from '../documents/storage/document-storage.service.js';
import { DocumentSummaryService } from '../summary/document-summary.service.js';

export class DoctorReviewController {
  // ============================================================================
  // QUEUE ENDPOINTS
  // ============================================================================

  public static async getQueue(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const queue = await QueueService.getQueue(req.user!, {
        department: req.query.department as string | undefined,
        status: req.query.status as any,
      });

      res.json({
        success: true,
        data: queue,
        count: queue.length,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async claimVisit(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const result = await QueueService.claimVisit(visitId, req.user!, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async releaseVisit(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const result = await QueueService.releaseVisit(visitId, req.user!);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // WORKSPACE & RAW VIEW ENDPOINTS
  // ============================================================================

  public static async getWorkspace(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const workspace = await WorkspaceService.getWorkspace(visitId, req.user!, {
        outOfQueueReason: req.query.outOfQueueReason as string | undefined,
      });

      res.json({
        success: true,
        data: workspace,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getRawView(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const rawView = await WorkspaceService.getRawView(visitId, req.user!);
      res.json({
        success: true,
        data: rawView,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // REVIEW ACTIONS ENDPOINTS
  // ============================================================================

  public static async startReview(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const review = await ReviewService.startReview(visitId, req.user!, req.body);
      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async submitResolution(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const resolution = await ReviewService.saveResolution(reviewId, req.body, req.user!);
      res.json({
        success: true,
        data: resolution,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async editStatement(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const statementId = req.params.statementId as string;
      const { editedText, previousTextRef } = req.body;
      const edit = await ReviewService.editStatement(reviewId, statementId, editedText, previousTextRef, req.user!);
      res.json({
        success: true,
        data: edit,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addStatement(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const { section, text, order } = req.body;
      const statement = await ReviewService.addDoctorStatement(reviewId, section, text, order, req.user!);
      res.json({
        success: true,
        data: statement,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async removeStatement(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const statementId = req.params.statementId as string;
      const result = await ReviewService.removeStatement(reviewId, statementId, req.user!);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async rejectDraft(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const { reason, note } = req.body;
      const review = await ReviewService.rejectDraft(reviewId, reason, note, req.user!);
      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async requestRegeneration(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const newSummary = await ReviewService.requestRegeneration(reviewId, req.body?.reason, req.user!);
      res.json({
        success: true,
        data: newSummary,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async confirmReview(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const { attestationAccepted, attestationVersion } = req.body;
      const confirmedRecord = await ConfirmationService.confirmReview(
        reviewId,
        req.user!,
        attestationAccepted,
        attestationVersion
      );
      res.json({
        success: true,
        data: confirmedRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // CONFIRMED RECORDS & AMENDMENT ENDPOINTS
  // ============================================================================

  public static async getLatestConfirmedRecord(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const record = await AmendmentService.getLatestConfirmedRecord(visitId);
      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getConfirmedRecordById(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const record = await AmendmentService.getConfirmedRecord(id);
      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getConfirmedRecordVersions(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const record = await AmendmentService.getConfirmedRecord(id);
      const versions = await AmendmentService.getVersions(record.visitId);
      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async amendConfirmedRecord(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { amendmentReason, statements, attestationAccepted, attestationVersion } = req.body;
      const record = await AmendmentService.amendRecord(
        id,
        req.user!,
        amendmentReason,
        statements,
        attestationAccepted,
        attestationVersion
      );
      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // PROVENANCE & SIGNED DOCUMENT SNIPPET ENDPOINTS
  // ============================================================================

  public static async getStatementSources(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const statementId = req.params.statementId as string;

      // Audit source opened
      await DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.SOURCE_OPENED,
        visitId: 'statement-provenance',
        actorId: req.user?.id,
        actorRole: req.user?.role,
        metadata: { statementId },
      });

      res.json({
        success: true,
        data: {
          statementId,
          explanation: 'Provenance traceability linked to Module 3 answers and Module 4 verified document fields.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Active short-lived signed snippet tokens (key: token -> { documentId, expiresAt })
  private static activeSnippetTokens = new Map<string, { documentId: string; expiresAt: Date }>();

  public static async getDocumentSnippet(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId as string;
      const requestedVisitId = req.query.visitId as string | undefined;
      const requestedPatientId = req.query.patientId as string | undefined;

      if (!req.user || !['DOCTOR', 'SUPER_ADMIN'].includes(req.user.role)) {
        throw new ForbiddenError('Signed document snippet access restricted to treating physicians.');
      }

      // Validate documentId against path traversal
      DocumentStorageService.validateIdentifier(documentId, 'documentId');
      if (requestedVisitId) {
        DocumentStorageService.validateIdentifier(requestedVisitId, 'visitId');
      }
      if (requestedPatientId) {
        DocumentStorageService.validateIdentifier(requestedPatientId, 'patientId');
      }

      const doc = await DocumentsRepository.findDocumentById(documentId);

      // Enforce cross-patient / visit isolation if document record exists
      if (doc) {
        if (requestedVisitId && doc.visit_id !== requestedVisitId) {
          throw new ForbiddenError('Access denied: Document does not belong to the requested visit session.');
        }
        if (requestedPatientId && doc.patient_id && doc.patient_id !== requestedPatientId) {
          throw new ForbiddenError('Access denied: Document does not belong to the requested patient.');
        }

        // Enforce claim check: if claimed by another doctor, verify unexpired claim
        const existingClaim = await DoctorReviewRepository.getClaim(doc.visit_id);
        if (
          existingClaim &&
          existingClaim.claimedByDoctorId &&
          existingClaim.claimedByDoctorId !== req.user.id &&
          req.user.role !== 'SUPER_ADMIN'
        ) {
          if (existingClaim.expiresAt && new Date(existingClaim.expiresAt) > new Date()) {
            if (!req.query.outOfQueueReason && !req.body?.outOfQueueReason) {
              throw new ForbiddenError(
                `Case is currently claimed by Dr. ${existingClaim.claimedByDoctorName || 'another doctor'}. Cannot access document sources without permission.`
              );
            }
          }
        }
      }

      const fileName = doc?.file_name || 'Prescription_Document.png';
      const visitId = doc?.visit_id || requestedVisitId || documentId;

      // Generate a short-lived cryptographic signed access token (15 minutes expiry)
      const { token: signedSnippetToken, expiresAt } = TokenUtil.generateSignedDocumentToken(
        documentId,
        req.user.id,
        15 * 60 * 1000
      );
      DoctorReviewController.activeSnippetTokens.set(signedSnippetToken, { documentId, expiresAt });

      // Clean up expired tokens
      const now = Date.now();
      for (const [t, data] of DoctorReviewController.activeSnippetTokens.entries()) {
        if (data.expiresAt.getTime() < now) {
          DoctorReviewController.activeSnippetTokens.delete(t);
        }
      }

      // Audit source inspection
      await DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.SOURCE_OPENED,
        visitId,
        actorId: req.user.id,
        actorRole: req.user.role,
        metadata: { documentId, snippetAccess: 'SIGNED_TOKEN_ISSUED' },
      });

      const cropUrl = `/api/v1/doctor/documents/${documentId}/image?token=${signedSnippetToken}`;

      res.json({
        success: true,
        data: {
          documentId,
          signedToken: signedSnippetToken,
          signedUrl: cropUrl,
          cropSnippetUrl: cropUrl,
          expiresAt: expiresAt.toISOString(),
          fileName,
          mimeType: doc?.mime_type || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          snippetRef: (req.query.snippetRef as string) || 'prescription_field_1',
          snippetCropCoordinates: { x: 45, y: 120, width: 340, height: 180 },
          message: 'Signed short-lived document snippet URL generated (expires in 15 minutes).',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async streamDocumentImage(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId as string;
      const token = req.query.token as string | undefined;
      const requestedVisitId = req.query.visitId as string | undefined;
      const requestedPatientId = req.query.patientId as string | undefined;

      // 0. Path traversal validation
      DocumentStorageService.validateIdentifier(documentId, 'documentId');
      if (requestedVisitId) {
        DocumentStorageService.validateIdentifier(requestedVisitId, 'visitId');
      }
      if (requestedPatientId) {
        DocumentStorageService.validateIdentifier(requestedPatientId, 'patientId');
      }

      let isAuthorized = false;
      let doctorId = 'signed-token-viewer';

      // 1. Check cryptographic signed query token (?token=...)
      if (token) {
        const verified = TokenUtil.verifySignedDocumentToken(token);
        if (verified && verified.documentId === documentId) {
          isAuthorized = true;
          doctorId = verified.doctorId;
        } else if (DoctorReviewController.activeSnippetTokens.has(token)) {
          const stored = DoctorReviewController.activeSnippetTokens.get(token)!;
          if (stored.documentId === documentId && stored.expiresAt > new Date()) {
            isAuthorized = true;
          }
        }
      }

      // 2. Check Bearer Authorization header if token not used or expired
      if (!isAuthorized && req.headers.authorization?.startsWith('Bearer ')) {
        const jwtToken = req.headers.authorization.split(' ')[1];
        if (jwtToken) {
          const claims = TokenUtil.verifyStaffAccessToken(jwtToken);
          if (!['DOCTOR', 'SUPER_ADMIN'].includes(claims.role)) {
            throw new ForbiddenError('Access restricted to physicians and administrators.');
          }

          isAuthorized = true;
          doctorId = claims.sub;
        }
      }

      // If caller is neither verified by signed token nor staff doctor Bearer header, deny immediately with 403
      if (!isAuthorized) {
        throw new ForbiddenError('Invalid, expired, or missing signed document access token');
      }

      // 3. Verify document exists in database/repository before streaming
      const doc = await DocumentsRepository.findDocumentById(documentId);
      if (!doc) {
        throw new NotFoundError(`Document not found: ${documentId}`);
      }

      // Enforce cross-patient visit association check if specified in query
      if (requestedVisitId && doc.visit_id !== requestedVisitId) {
        throw new ForbiddenError('Access denied: Document does not belong to the requested visit session.');
      }
      if (requestedPatientId && doc.patient_id && doc.patient_id !== requestedPatientId) {
        throw new ForbiddenError('Access denied: Document does not belong to the requested patient.');
      }

      // Check claim ownership: if claimed by another doctor, block unauthorized viewing unless super admin or outOfQueueReason
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
      if (!isSuperAdmin && doctorId && doctorId !== 'signed-token-viewer') {
        const existingClaim = await DoctorReviewRepository.getClaim(doc.visit_id);
        if (
          existingClaim &&
          existingClaim.claimedByDoctorId &&
          existingClaim.claimedByDoctorId !== doctorId
        ) {
          if (existingClaim.expiresAt && new Date(existingClaim.expiresAt) > new Date()) {
            if (!req.query.outOfQueueReason && !req.body?.outOfQueueReason) {
              throw new ForbiddenError('Access denied: Case is claimed by another physician.');
            }
          }
        }
      }

      // Retrieve verified physical file metadata from DocumentsService
      const fileInfo = await DocumentsService.getDocumentFile(documentId);

      // Audit source image inspection
      DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.SOURCE_OPENED,
        visitId: fileInfo.visitId || documentId,
        actorId: doctorId,
        actorRole: 'DOCTOR',
        metadata: { documentId, streamType: 'ORIGINAL_IMAGE_STREAM', fileName: fileInfo.fileName },
      }).catch(() => {});

      const safeFileName = path.basename(fileInfo.fileName).replace(/["\r\n]/g, '_');
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.sendFile(fileInfo.filePath);
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // MEDICAL RECORDS & AI SUMMARIES ENDPOINTS (Patient-Doctor Portal Integration)
  // ============================================================================

  public static async getMedicalRecordsForVisit(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const docs = await DocumentsRepository.findDocumentsByVisitId(visitId);

      // Attach individual AI summary to each document
      const enrichedDocs = await Promise.all(
        docs.map(async (doc) => {
          let summary = (doc as any).summary;
          if (!summary && doc.ocr_status !== 'FAILED' && doc.overall_status !== 'EXTRACTION_FAILED') {
            try {
              summary = await DocumentSummaryService.summarizeDocument(doc.id);
            } catch {}
          }
          return {
            id: doc.id,
            visitId: doc.visit_id,
            patientId: doc.patient_id,
            documentType: doc.document_type,
            fileName: doc.file_name,
            mimeType: doc.mime_type,
            fileSizeBytes: doc.file_size_bytes,
            ocrStatus: doc.ocr_status,
            overallStatus: doc.overall_status,
            ocrErrorMessage: doc.ocr_error_message,
            uploadedAt: doc.uploaded_at,
            summary,
          };
        })
      );

      res.json({
        success: true,
        data: enrichedDocs,
        message: 'Medical records and individual AI summaries retrieved',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getIndividualDocumentSummary(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId as string;
      const summary = await DocumentSummaryService.summarizeDocument(documentId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getCombinedRecordSummary(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const forceRegenerate = req.query.regenerate === 'true';
      const summary = await DocumentSummaryService.getCombinedRecordSummary(visitId, forceRegenerate);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async regenerateCombinedRecordSummary(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const summary = await DocumentSummaryService.getCombinedRecordSummary(visitId, true);
      res.json({
        success: true,
        data: summary,
        message: 'Combined medical records summary regenerated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async approveCombinedRecordSummary(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.params.visitId as string;
      const doctorName = req.user?.fullName || req.user?.email || 'Attending Physician';
      const notes = req.body?.notes;
      const summary = await DocumentSummaryService.approveCombinedSummary(visitId, doctorName, notes);
      res.json({
        success: true,
        data: summary,
        message: 'Combined medical records summary approved by physician',
      });
    } catch (error) {
      next(error);
    }
  }
}
