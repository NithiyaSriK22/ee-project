"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.globalErrorHandler = void 0;
const app_error_js_1 = require("../errors/app-error.js");
const error_codes_js_1 = require("../errors/error-codes.js");
const response_util_js_1 = require("../utils/response.util.js");
const logger_js_1 = require("../config/logger.js");
const env_config_js_1 = require("../config/env.config.js");
const globalErrorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    const requestId = req.requestId;
    if (err instanceof app_error_js_1.AppError) {
        // Known domain / operational error
        logger_js_1.logger.warn(`Operational error: ${err.message}`, {
            requestId,
            code: err.code,
            statusCode: err.statusCode,
            path: req.originalUrl,
        });
        response_util_js_1.ResponseUtil.error(res, err.statusCode, err.code, err.message, err.details);
        return;
    }
    // Handle express body-parser entity too large error
    if (err.type === 'entity.too.large') {
        logger_js_1.logger.warn(`Payload too large: ${err.message}`, { requestId, path: req.originalUrl });
        response_util_js_1.ResponseUtil.error(res, 413, error_codes_js_1.ErrorCode.VALIDATION_ERROR, 'File size exceeds maximum permitted limit of 15MB.');
        return;
    }
    // Handle Multer upload errors
    if (err.name === 'MulterError') {
        logger_js_1.logger.warn(`Multer upload error: ${err.message}`, { requestId, path: req.originalUrl });
        const isSize = err.code === 'LIMIT_FILE_SIZE';
        response_util_js_1.ResponseUtil.error(res, 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR, isSize ? 'File size exceeds maximum permitted limit of 15MB.' : `File upload error: ${err.message}`);
        return;
    }
    // Unhandled / unexpected internal error
    logger_js_1.logger.error(`Unhandled system error: ${err.message}`, {
        requestId,
        name: err.name,
        stack: env_config_js_1.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.originalUrl,
    });
    response_util_js_1.ResponseUtil.error(res, 500, error_codes_js_1.ErrorCode.INTERNAL_ERROR, 'An unexpected system error occurred. Please contact hospital technical support.');
};
exports.globalErrorHandler = globalErrorHandler;
const notFoundHandler = (req, res) => {
    response_util_js_1.ResponseUtil.error(res, 404, error_codes_js_1.ErrorCode.NOT_FOUND, `Endpoint not found: ${req.method} ${req.originalUrl}`);
};
exports.notFoundHandler = notFoundHandler;
