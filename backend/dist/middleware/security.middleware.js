"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiterMiddleware = exports.corsMiddleware = exports.permissionsPolicyMiddleware = exports.helmetMiddleware = void 0;
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_config_js_1 = require("../config/env.config.js");
const response_util_js_1 = require("../utils/response.util.js");
const error_codes_js_1 = require("../errors/error-codes.js");
// 1. Helmet security headers
exports.helmetMiddleware = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'", env_config_js_1.env.KIOSK_FRONTEND_URL, env_config_js_1.env.DOCTOR_PORTAL_FRONTEND_URL],
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    frameguard: {
        action: 'sameorigin',
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
    },
    crossOriginEmbedderPolicy: false,
});
// Permissions-Policy header middleware
const permissionsPolicyMiddleware = (_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), interest-cohort=(), payment=()');
    next();
};
exports.permissionsPolicyMiddleware = permissionsPolicyMiddleware;
// 2. Dual-Origin CORS configuration
const allowedOrigins = [
    env_config_js_1.env.KIOSK_FRONTEND_URL,
    env_config_js_1.env.DOCTOR_PORTAL_FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
];
exports.corsMiddleware = (0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like health checks, server-to-server) in development/test
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) || env_config_js_1.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'X-Kiosk-Device-Code',
        'X-Kiosk-Session-Token',
    ],
    exposedHeaders: ['X-Request-ID'],
});
// 3. Baseline Rate Limiter (with safety-critical skip for Module 6 emergency help requests and health probes)
exports.rateLimiterMiddleware = (0, express_rate_limit_1.default)({
    windowMs: env_config_js_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_config_js_1.env.NODE_ENV === 'development' ? 5000 : env_config_js_1.env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Safety requirement: Never block patient emergency help button requests or health checks
        return (req.path.includes('/help-request') ||
            req.path.includes('/triage/alerts') ||
            req.path.includes('/health') ||
            req.path.includes('/ready') ||
            req.path.endsWith('/status') ||
            req.path.endsWith('/live'));
    },
    handler: (_req, res) => {
        response_util_js_1.ResponseUtil.error(res, 429, error_codes_js_1.ErrorCode.RATE_LIMITED, 'Too many requests received from this client. Please slow down and try again shortly.');
    },
});
