"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseUtil = void 0;
class ResponseUtil {
    static success(res, data, message = 'Request successful', statusCode = 200, meta) {
        const payload = {
            success: true,
            data,
            message,
            meta: {
                timestamp: new Date().toISOString(),
                ...(meta || {}),
            },
        };
        return res.status(statusCode).json(payload);
    }
    static created(res, data, message = 'Resource created successfully', meta) {
        return this.success(res, data, message, 201, meta);
    }
    static error(res, statusCode, code, message, details = []) {
        const payload = {
            success: false,
            error: {
                code,
                message,
                details: details.length > 0 ? details : undefined,
            },
        };
        return res.status(statusCode).json(payload);
    }
}
exports.ResponseUtil = ResponseUtil;
