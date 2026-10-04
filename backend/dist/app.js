"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const security_middleware_js_1 = require("./middleware/security.middleware.js");
const request_id_middleware_js_1 = require("./middleware/request-id.middleware.js");
const request_logger_middleware_js_1 = require("./middleware/request-logger.middleware.js");
const error_middleware_js_1 = require("./middleware/error.middleware.js");
const index_js_1 = require("./routes/index.js");
const createApp = () => {
    const app = (0, express_1.default)();
    // 1. Trust proxy in production for hospital proxies/load balancers
    app.set('trust proxy', 1);
    // 2. Request context & Correlation ID
    app.use(request_id_middleware_js_1.requestIdMiddleware);
    // 3. Security headers & CORS
    app.use(security_middleware_js_1.helmetMiddleware);
    app.use(security_middleware_js_1.corsMiddleware);
    // 4. Rate Limiting
    app.use(security_middleware_js_1.rateLimiterMiddleware);
    // 5. Body Parsing with safe limit to prevent payload flooding
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
    // 6. Structured Request Logger (Zero PHI)
    app.use(request_logger_middleware_js_1.requestLoggerMiddleware);
    // 7. Mount Versioned API Routes (/api/v1)
    app.use('/api/v1', index_js_1.apiV1Router);
    // 8. 404 Not Found Handler
    app.use(error_middleware_js_1.notFoundHandler);
    // 9. Centralized Global Error Handler
    app.use(error_middleware_js_1.globalErrorHandler);
    return app;
};
exports.createApp = createApp;
