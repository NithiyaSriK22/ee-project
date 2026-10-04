"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLoggerMiddleware = void 0;
const logger_js_1 = require("../config/logger.js");
const requestLoggerMiddleware = (req, res, next) => {
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
            logger_js_1.logger.error(`HTTP ${req.method} ${req.originalUrl} failed`, context);
        }
        else if (res.statusCode >= 400) {
            logger_js_1.logger.warn(`HTTP ${req.method} ${req.originalUrl} client error`, context);
        }
        else {
            logger_js_1.logger.info(`HTTP ${req.method} ${req.originalUrl} completed`, context);
        }
    });
    next();
};
exports.requestLoggerMiddleware = requestLoggerMiddleware;
