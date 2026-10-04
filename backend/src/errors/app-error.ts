import { ErrorCode, ErrorCodeType } from './error-codes.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeType;
  public readonly isOperational: boolean;
  public readonly details: unknown[];

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCodeType = ErrorCode.INTERNAL_ERROR,
    details: unknown[] = []
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Invalid request data', details: unknown[] = []) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, ErrorCode.UNAUTHORIZED);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}

export const UnauthorizedError = AuthenticationError;
export type UnauthorizedError = AuthenticationError;

export const ForbiddenError = AuthorizationError;
export type ForbiddenError = AuthorizationError;

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, ErrorCode.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict occurred') {
    super(message, 409, ErrorCode.CONFLICT);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429, ErrorCode.RATE_LIMITED);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details: unknown[] = []) {
    super(message, 500, ErrorCode.DATABASE_ERROR, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected internal error occurred') {
    super(message, 500, ErrorCode.INTERNAL_ERROR);
  }
}
