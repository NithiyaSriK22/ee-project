import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { AuthService } from './auth.service.js';
import { ResponseUtil } from '../../utils/response.util.js';

export class AuthController {
  public static async register(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.registerStaff(req.body);
      ResponseUtil.created(res, user, 'Staff account registered successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.loginStaff(req.body);
      ResponseUtil.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body?.refreshToken;
      const result = await AuthService.logout(refreshToken);
      ResponseUtil.success(res, result, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshAccessToken(refreshToken);
      ResponseUtil.success(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.error(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }
      const profile = await AuthService.getProfile(req.user.id);
      ResponseUtil.success(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async changePassword(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.error(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }
      const result = await AuthService.changePassword(req.user.id, req.body);
      ResponseUtil.success(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async forgotPassword(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      ResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  public static async resetPassword(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resetPassword(req.body);
      ResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  public static async verifyEmail(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.verifyEmail(req.body.token);
      ResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  public static async resendVerification(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resendVerification(req.body.email);
      ResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
