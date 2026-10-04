import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { InterviewService } from './interview.service.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { AuthenticationError, ValidationError } from '../../errors/app-error.js';

export class InterviewAdminController {
  public static async listTemplates(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = await InterviewService.listTemplates();
      ResponseUtil.success(res, templates, 'Interview templates retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getTemplateById(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Template ID is required');
      }
      const template = await InterviewService.getTemplateById(id);
      ResponseUtil.success(res, template, 'Interview template retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async createTemplate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.id;
      const template = await InterviewService.createTemplate(req.body, actorId);
      ResponseUtil.created(res, template, 'Interview template created successfully (DRAFT)');
    } catch (error) {
      next(error);
    }
  }

  public static async updateTemplate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Template ID is required');
      }
      const updated = await InterviewService.updateTemplate(id, req.body);
      ResponseUtil.success(res, updated, 'Interview template updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async submitForReview(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Template ID is required');
      }
      const updated = await InterviewService.submitForReview(id);
      ResponseUtil.success(res, updated, 'Interview template submitted for clinical review');
    } catch (error) {
      next(error);
    }
  }

  public static async publishTemplate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Template ID is required');
      }
      const actorId = req.user?.id;
      const published = await InterviewService.publishTemplate(id, actorId);
      ResponseUtil.success(res, published, 'Interview template validated and published as ACTIVE');
    } catch (error) {
      next(error);
    }
  }

  public static async retireTemplate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Template ID is required');
      }
      const actorId = req.user?.id;
      const retired = await InterviewService.retireTemplate(id, actorId);
      ResponseUtil.success(res, retired, 'Interview template retired from live clinical intake');
    } catch (error) {
      next(error);
    }
  }

  public static async addQuestion(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Template ID is required');
      }
      const question = await InterviewService.addQuestion(id, req.body);
      ResponseUtil.created(res, question, 'Question added to interview template');
    } catch (error) {
      next(error);
    }
  }

  public static async updateQuestion(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Question ID is required');
      }
      const updated = await InterviewService.updateQuestion(id, req.body);
      ResponseUtil.success(res, updated, 'Interview question updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async archiveQuestion(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Question ID is required');
      }
      const result = await InterviewService.archiveQuestion(id);
      ResponseUtil.success(res, result, 'Interview question archived successfully');
    } catch (error) {
      next(error);
    }
  }
}

export class InterviewKioskController {
  public static async start(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { visitId, patientId } = req.kioskSession;
      const requestedTemplateId = req.body?.templateId;

      const result = await InterviewService.startKioskInterview(visitId, patientId, requestedTemplateId);
      ResponseUtil.success(res, result, 'Clinical interview intake session started');
    } catch (error) {
      next(error);
    }
  }

  public static async getCurrentQuestion(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const result = await InterviewService.getCurrentQuestion(req.kioskSession.visitId);
      ResponseUtil.success(res, result, 'Current interview state retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async submitAnswer(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { visitId, patientId } = req.kioskSession;
      const result = await InterviewService.submitAnswer(visitId, patientId, req.body);
      ResponseUtil.success(res, result, 'Answer recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async complete(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const result = await InterviewService.completeInterview(req.kioskSession.visitId);
      ResponseUtil.success(res, result, 'Interview completed successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getProgress(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const result = await InterviewService.getCurrentQuestion(req.kioskSession.visitId);
      ResponseUtil.success(
        res,
        {
          progress: result.progress,
          sessionStatus: result.session.status,
          currentSection: result.currentQuestion?.section || null,
        },
        'Interview progress retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}
