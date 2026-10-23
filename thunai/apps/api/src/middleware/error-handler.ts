import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request input payload',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
        requestId,
      },
    });
    return;
  }

  // 2. Custom Application Errors (e.g. 409 Must-Resolve Conflict)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  // 3. SQLite Abort / Immutable Record Errors
  if (err?.message?.includes('IMMUTABLE_RECORD')) {
    res.status(403).json({
      error: {
        code: 'IMMUTABLE_RECORD_VIOLATION',
        message: err.message,
        requestId,
      },
    });
    return;
  }

  // 4. Default / Unhandled 500
  console.error(`[Unhandled Error] ${requestId}:`, err.message);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
      requestId,
    },
  });
}
