import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { KioskSessionService } from './kiosk-session.service.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { AuthenticationError } from '../../errors/app-error.js';

export class KioskSessionController {
  public static async start(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await KioskSessionService.startSession(req.body);
      ResponseUtil.created(res, result, 'Kiosk session initialized successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }
      const result = await KioskSessionService.getSessionMe(req.kioskSession.visitId);
      ResponseUtil.success(res, result, 'Active session retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async end(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }
      const result = await KioskSessionService.endSession(req.kioskSession.visitId);
      ResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
