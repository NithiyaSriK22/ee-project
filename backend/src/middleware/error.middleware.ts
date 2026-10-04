import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { ResponseUtil } from '../utils/response.util.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.config.js';
import { AppRequest } from '../types/api.types.js';

export const globalErrorHandler = (
  err: Error,
  req: AppRequest,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    // Known domain / operational error
    logger.warn(`Operational error: ${err.message}`, {
      requestId,
      code: err.code,
      statusCode: err.statusCode,
      path: req.originalUrl,
    });

    ResponseUtil.error(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Unhandled / unexpected internal error
  logger.error(`Unhandled system error: ${err.message}`, {
    requestId,
    name: err.name,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
  });

  ResponseUtil.error(
    res,
    500,
    ErrorCode.INTERNAL_ERROR,
    'An unexpected system error occurred. Please contact hospital technical support.'
  );
};

export const notFoundHandler = (req: Request, res: Response): void => {
  ResponseUtil.error(
    res,
    404,
    ErrorCode.NOT_FOUND,
    `Endpoint not found: ${req.method} ${req.originalUrl}`
  );
};
