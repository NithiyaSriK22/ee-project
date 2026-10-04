import { Response, NextFunction } from 'express';
import { AppRequest } from '../types/api.types.js';
import { logger } from '../config/logger.js';

export const requestLoggerMiddleware = (req: AppRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const context = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl} failed`, context);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl} client error`, context);
    } else {
      logger.info(`HTTP ${req.method} ${req.originalUrl} completed`, context);
    }
  });

  next();
};
