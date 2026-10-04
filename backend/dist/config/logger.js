"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const env_config_js_1 = require("./env.config.js");
// PHI / Secret keys that must ALWAYS be redacted from any log object
const SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'jwt',
    'secret',
    'authorization',
    'cookie',
    'aadhaar',
    'national_id',
    'phone',
    'email',
    'patient_name',
    'raw_ocr_text',
    'transcript',
    'interview_answer',
    'clinical_summary',
    'diagnosis',
    'prescription_image',
    'file_buffer',
]);
const sanitizeLogData = (data, depth = 0) => {
    if (depth > 3 || data === null || data === undefined)
        return data;
    if (typeof data !== 'object')
        return data;
    if (Array.isArray(data)) {
        return data.map((item) => sanitizeLogData(item, depth + 1));
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
            sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
        }
        else {
            sanitized[key] = sanitizeLogData(value, depth + 1);
        }
    }
    return sanitized;
};
class Logger {
    logLevels = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };
    currentLevelScore;
    constructor() {
        this.currentLevelScore = this.logLevels[env_config_js_1.env.LOG_LEVEL] ?? 1;
    }
    formatMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        const sanitizedContext = context ? sanitizeLogData(context) : undefined;
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...(sanitizedContext ? { context: sanitizedContext } : {}),
        };
        return JSON.stringify(logEntry);
    }
    debug(message, context) {
        if (this.currentLevelScore <= this.logLevels.debug) {
            console.debug(this.formatMessage('debug', message, context));
        }
    }
    info(message, context) {
        if (this.currentLevelScore <= this.logLevels.info) {
            console.info(this.formatMessage('info', message, context));
        }
    }
    warn(message, context) {
        if (this.currentLevelScore <= this.logLevels.warn) {
            console.warn(this.formatMessage('warn', message, context));
        }
    }
    error(message, context) {
        if (this.currentLevelScore <= this.logLevels.error) {
            console.error(this.formatMessage('error', message, context));
        }
    }
}
exports.logger = new Logger();
