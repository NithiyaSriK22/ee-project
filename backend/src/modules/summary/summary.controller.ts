import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { SummaryService } from './summary.service.js';
import { ValidationError } from '../../errors/app-error.js';

export class SummaryController {
  public static async getLatestSummary(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { visitId } = req.params;
      const summary = await SummaryService.getLatestSummaryForVisit(visitId!, req.user);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getSummaryVersions(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { visitId } = req.params;
      const versions = await SummaryService.getSummaryVersionsForVisit(visitId!, req.user);
      res.status(200).json({
        success: true,
        data: versions,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getSummaryById(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { summaryId } = req.params;
      const summary = await SummaryService.getSummaryById(summaryId!, req.user);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async regenerateSummary(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { visitId } = req.params;
      const summary = await SummaryService.generateSummaryForVisit(visitId!, {
        forceRegenerate: true,
        triggeredBy: req.user?.id,
      });
      res.status(201).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getKioskSummaryStatus(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const visitId = req.kioskSession?.visitId || (req.query.visitId as string);
      if (!visitId) {
        throw new ValidationError('Kiosk session or visitId parameter required');
      }

      const status = await SummaryService.getKioskSummaryStatus(visitId);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // ADMIN PROMPT MANAGEMENT CONTROLLERS
  // ============================================================================

  public static async listPrompts(
    _req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const templates = await SummaryService.listPromptTemplates();
      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createPrompt(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const template = await SummaryService.createPromptTemplate(req.body, req.user);
      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async submitPromptReview(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await SummaryService.submitPromptForReview(id!, req.user);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async runEvaluation(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const result = await SummaryService.runEvaluationForPrompt(id!, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async activatePrompt(
    req: AppRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await SummaryService.activatePromptTemplate(id!, req.user);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
