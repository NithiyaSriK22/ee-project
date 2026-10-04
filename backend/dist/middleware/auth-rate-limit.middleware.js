"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_config_js_1 = require("../config/env.config.js");
const response_util_js_1 = require("../utils/response.util.js");
const error_codes_js_1 = require("../errors/error-codes.js");
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: env_config_js_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_config_js_1.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
        response_util_js_1.ResponseUtil.error(res, 429, error_codes_js_1.ErrorCode.RATE_LIMITED, 'Too many authentication attempts. Please try again after 15 minutes.');
    },
});
