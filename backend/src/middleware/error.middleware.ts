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

  // Handle express body-parser entity too large error
  if ((err as any).type === 'entity.too.large') {
    logger.warn(`Payload too large: ${err.message}`, { requestId, path: req.originalUrl });
    ResponseUtil.error(res, 413, ErrorCode.VALIDATION_ERROR, 'File size exceeds maximum permitted limit of 15MB.');
    return;
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    logger.warn(`Multer upload error: ${err.message}`, { requestId, path: req.originalUrl });
    const isSize = (err as any).code === 'LIMIT_FILE_SIZE';
    ResponseUtil.error(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      isSize ? 'File size exceeds maximum permitted limit of 15MB.' : `File upload error: ${err.message}`
    );
    return;
  }

  // Handle Prisma Known Request Errors (e.g. unique constraint, not found, foreign key)
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    logger.warn(`Database constraint error: ${prismaErr.code}`, {
      requestId,
      code: prismaErr.code,
      path: req.originalUrl,
    });

    if (prismaErr.code === 'P2002') {
      ResponseUtil.error(
        res,
        409,
        ErrorCode.CONFLICT,
        'A conflicting clinical record or session already exists for this visit.'
      );
      return;
    }
    if (prismaErr.code === 'P2025') {
      ResponseUtil.error(res, 404, ErrorCode.NOT_FOUND, 'The requested clinical resource was not found.');
      return;
    }
    if (prismaErr.code === 'P2003') {
      ResponseUtil.error(res, 400, ErrorCode.VALIDATION_ERROR, 'Referenced clinical record does not exist.');
      return;
    }
  }

  // Handle Prisma Validation Errors (e.g. malformed UUID or parameter type conversion)
  if (err.name === 'PrismaClientValidationError') {
    logger.warn('Database validation error caught in error middleware', {
      requestId,
      path: req.originalUrl,
    });
    ResponseUtil.error(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid record format or identifier provided.');
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
