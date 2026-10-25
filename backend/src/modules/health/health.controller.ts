import { Request, Response, NextFunction } from 'express';
import { HealthService } from './health.service.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { checkDatabaseHealth } from '../../database/prisma.js';

export class HealthController {
  public static async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await HealthService.getDetailedHealth();
      const statusCode = 200; // 200 for health endpoint info, status reported in payload
      ResponseUtil.success(res, health, 'System health check completed', statusCode);
    } catch (error) {
      next(error);
    }
  }

  public static getLiveness(_req: Request, res: Response): void {
    const liveness = HealthService.getLiveness();
    ResponseUtil.success(res, liveness, 'Service is alive');
  }

  public static async getReadiness(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const readiness = await HealthService.getReadiness();
      const statusCode = readiness.ready ? 200 : 503;
      ResponseUtil.success(
        res,
        readiness,
        readiness.ready ? 'Service is ready' : 'Service is not ready to accept traffic',
        statusCode
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getDatabaseHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isConnected = await checkDatabaseHealth(true);
      const statusCode = isConnected ? 200 : 503;
      ResponseUtil.success(
        res,
        {
          database: isConnected ? 'connected' : 'disconnected',
          connected: isConnected,
          service: 'postgresql',
          port: 5432,
        },
        isConnected ? 'PostgreSQL database connection is operational' : 'PostgreSQL database connection is unavailable',
        statusCode
      );
    } catch (error) {
      next(error);
    }
  }
}
