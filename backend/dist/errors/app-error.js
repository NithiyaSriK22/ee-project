"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.InternalServerError = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const error_codes_js_1 = require("./error-codes.js");
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    details;
    constructor(message, statusCode = 500, code = error_codes_js_1.ErrorCode.INTERNAL_ERROR, details = []) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message = 'Invalid request data', details = []) {
        super(message, 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR, details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, error_codes_js_1.ErrorCode.UNAUTHORIZED);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Permission denied') {
        super(message, 403, error_codes_js_1.ErrorCode.FORBIDDEN);
    }
}
exports.AuthorizationError = AuthorizationError;
exports.UnauthorizedError = AuthenticationError;
exports.ForbiddenError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, error_codes_js_1.ErrorCode.NOT_FOUND);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict occurred') {
        super(message, 409, error_codes_js_1.ErrorCode.CONFLICT);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Too many requests. Please try again later.') {
        super(message, 429, error_codes_js_1.ErrorCode.RATE_LIMITED);
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', details = []) {
        super(message, 500, error_codes_js_1.ErrorCode.DATABASE_ERROR, details);
    }
}
exports.DatabaseError = DatabaseError;
class InternalServerError extends AppError {
    constructor(message = 'An unexpected internal error occurred') {
        super(message, 500, error_codes_js_1.ErrorCode.INTERNAL_ERROR);
    }
}
exports.InternalServerError = InternalServerError;
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable. Please proceed to the OPD intake desk.') {
        super(message, 503, error_codes_js_1.ErrorCode.INTERNAL_ERROR);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
