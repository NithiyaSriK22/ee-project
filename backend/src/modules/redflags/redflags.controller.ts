import { Request, Response, NextFunction } from 'express';
import { RedFlagsService } from './redflags.service.js';
import { SSEBroadcaster } from './alerts/sse-broadcaster.js';
import {
  HelpRequestSchema,
  AcknowledgeAlertSchema,
  StartAssessmentSchema,
  ResolveAlertSchema,
  EscalateAlertSchema,
  DismissAlertSchema,
  CreateRuleSchema,
  UpdateRuleSchema,
  AlertFilterSchema,
} from './redflags.schemas.js';

export class RedFlagsController {
  // ============================================================================
  // KIOSK ENDPOINTS (Session-scoped)
  // ============================================================================

  public static async requestHelp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = HelpRequestSchema.parse(req.body);
      const visitId = (req as any).kioskSession?.visitId || (req as any).user?.visitId || req.body.visitId || `unregistered-${Date.now()}`;
      const kioskDeviceId = parsed.kioskDeviceId || (req as any).kioskSession?.kioskDeviceId;

      const alert = await RedFlagsService.raiseManualHelpRequest(
        visitId,
        kioskDeviceId,
        parsed.reason
      );

      res.status(201).json({
        success: true,
        message: 'A staff member has been alerted to assist you at this kiosk. Please stay here.',
        data: {
          alertId: alert.id,
          status: 'HELP_REQUESTED',
          kioskLocation: alert.kioskLocation,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getKioskAlertStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = (req as any).kioskSession?.visitId || (req as any).user?.visitId || (req.query.visitId as string);
      if (!visitId) {
        res.status(200).json({
          success: true,
          data: { hasActiveAlert: false, messageType: null },
        });
        return;
      }

      const status = await RedFlagsService.getKioskAlertStatus(visitId);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // STAFF TRIAGE QUEUE ENDPOINTS
  // ============================================================================

  public static async listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = AlertFilterSchema.parse(req.query);
      const alerts = await RedFlagsService.listAlerts(filter);

      res.status(200).json({
        success: true,
        data: alerts,
        meta: { total: alerts.length },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAlertById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alert = await RedFlagsService.getAlertById(req.params.id as string);
      res.status(200).json({
        success: true,
        data: alert,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async acknowledgeAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = AcknowledgeAlertSchema.parse(req.body);
      const actorId = (req as any).user?.id;
      const actorRole = (req as any).user?.role;

      const updated = await RedFlagsService.acknowledgeAlert(
        req.params.id as string,
        actorId,
        actorRole,
        parsed.note
      );

      res.status(200).json({
        success: true,
        message: 'Alert acknowledged',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async startAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = StartAssessmentSchema.parse(req.body);
      const actorId = (req as any).user?.id;
      const actorRole = (req as any).user?.role;

      const updated = await RedFlagsService.startAssessment(
        req.params.id as string,
        actorId,
        actorRole,
        parsed.note
      );

      res.status(200).json({
        success: true,
        message: 'Alert moved to IN_ASSESSMENT',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = ResolveAlertSchema.parse(req.body);
      const actorId = (req as any).user?.id;
      const actorRole = (req as any).user?.role;

      const updated = await RedFlagsService.resolveAlert(
        req.params.id as string,
        actorId,
        actorRole,
        parsed.resolutionType,
        parsed.resolutionNote
      );

      res.status(200).json({
        success: true,
        message: 'Alert resolved successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async escalateAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = EscalateAlertSchema.parse(req.body);
      const actorId = (req as any).user?.id;
      const actorRole = (req as any).user?.role;

      const updated = await RedFlagsService.escalateAlert(
        req.params.id as string,
        actorId,
        actorRole,
        parsed.reason
      );

      res.status(200).json({
        success: true,
        message: 'Alert escalated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async dismissAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = DismissAlertSchema.parse(req.body);
      const actorId = (req as any).user?.id;
      const actorRole = (req as any).user?.role;

      const updated = await RedFlagsService.dismissAlert(
        req.params.id as string,
        actorId,
        actorRole,
        parsed.dismissalReason,
        parsed.note
      );

      res.status(200).json({
        success: true,
        message: 'Alert dismissed as false positive',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static streamAlerts(req: Request, res: Response): void {
    const clientId = `staff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const role = (req as any).user?.role;

    SSEBroadcaster.addClient(clientId, res, role);

    req.on('close', () => {
      SSEBroadcaster.removeClient(clientId);
    });
  }

  // ============================================================================
  // ADMIN & CLINICAL REVIEW ENDPOINTS
  // ============================================================================

  public static async listRules(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await RedFlagsService.listRules();
      res.status(200).json({
        success: true,
        data: rules,
        meta: { total: rules.length },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getRuleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await RedFlagsService.getRuleById(req.params.id as string);
      res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateRuleSchema.parse(req.body);
      const authorId = (req as any).user?.id;

      const rule = await RedFlagsService.createRule(
        {
          ruleCode: parsed.ruleCode,
          name: parsed.name,
          description: parsed.description,
          severityTier: parsed.severityTier,
          conditionTree: parsed.conditionTree,
          testCases: parsed.testCases,
          raiseOnIndeterminate: parsed.raiseOnIndeterminate,
          recommendedStaffAction: parsed.recommendedStaffAction,
          isIllustrative: parsed.isIllustrative,
        },
        authorId
      );

      res.status(201).json({
        success: true,
        message: 'Red-flag rule authored in DRAFT state',
        data: rule,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = UpdateRuleSchema.parse(req.body);
      const updated = await RedFlagsService.updateRule(req.params.id as string, parsed);

      res.status(200).json({
        success: true,
        message: 'Red-flag rule updated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async submitRuleForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as any).user?.id;
      const updated = await RedFlagsService.submitRuleForReview(req.params.id as string, actorId);

      res.status(200).json({
        success: true,
        message: 'Red-flag rule submitted for clinical review after passing test harness',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async approveRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewerId = (req as any).user?.id;
      const reviewerRole = (req as any).user?.role;

      const updated = await RedFlagsService.approveRule(req.params.id as string, reviewerId, reviewerRole);

      res.status(200).json({
        success: true,
        message: 'Red-flag rule successfully approved and activated by clinician',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async retireRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as any).user?.id;
      const updated = await RedFlagsService.retireRule(req.params.id as string, actorId);

      res.status(200).json({
        success: true,
        message: 'Red-flag rule retired',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async runRuleTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const testReport = await RedFlagsService.runRuleTests(req.params.id as string);
      res.status(200).json({
        success: true,
        data: testReport,
      });
    } catch (err) {
      next(err);
    }
  }
}
