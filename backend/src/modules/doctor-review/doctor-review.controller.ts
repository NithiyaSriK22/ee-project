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
import { ForbiddenError } from '../../errors/app-error.js';

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

  public static async getDocumentSnippet(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId as string;

      if (!req.user || !['DOCTOR', 'SUPER_ADMIN'].includes(req.user.role)) {
        throw new ForbiddenError('Signed document snippet access restricted to treating physicians.');
      }

      // Generate a short-lived signed access token (5 minutes expiry)
      const signedSnippetToken = TokenUtil.generateRandomToken(24);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Audit source inspection
      await DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.SOURCE_OPENED,
        visitId: documentId || 'unknown-doc',
        actorId: req.user.id,
        actorRole: req.user.role,
        metadata: { documentId, snippetAccess: 'SIGNED_TOKEN_ISSUED' },
      });

      res.json({
        success: true,
        data: {
          documentId,
          signedToken: signedSnippetToken,
          expiresAt,
          cropSnippetUrl: `/api/v1/doctor/documents/${documentId}/image?token=${signedSnippetToken}`,
          message: 'Signed short-lived document snippet URL generated (expires in 5 minutes).',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
