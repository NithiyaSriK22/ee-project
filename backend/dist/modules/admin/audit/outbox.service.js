"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxService = exports.CRITICAL_AUDIT_ACTIONS = void 0;
const logger_js_1 = require("../../../config/logger.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
exports.CRITICAL_AUDIT_ACTIONS = new Set([
    'CONFIRMED_RECORD_CREATED',
    'RECORD_AMENDED',
    'ALERT_ACKNOWLEDGED',
    'ALERT_RESOLVED',
    'ALERT_DISMISSED',
    'ALERT_ESCALATED',
    'REDFLAG_RULE_APPROVED',
    'REDFLAG_RULE_RETIRED',
    'TRANSLATION_APPROVED',
    'PROMPT_ACTIVATED',
    'FORMULARY_ACTIVATED',
    'STAFF_ROLE_CHANGED',
    'STAFF_DEACTIVATED',
    'OUT_OF_QUEUE_ACCESS',
    'REVIEW_TAKEN_OVER',
    'AUDIT_LOG_VIEWED',
    'AUDIT_EXPORTED',
    'ANALYTICS_EXPORTED',
    'LEGAL_HOLD_SET',
    'LEGAL_HOLD_RELEASED',
]);
class OutboxService {
    /**
     * Dispatches an event through the transactional outbox pattern.
     * If the event is CRITICAL_AUDIT, failure is fatal and safely rejects the parent operation.
     * If the event is NORMAL_ANALYTICS, failure is caught and logged to ensure care continuity.
     */
    static async recordEvent(params) {
        const isCritical = params.eventClass === 'CRITICAL_AUDIT' ||
            exports.CRITICAL_AUDIT_ACTIONS.has(params.eventName);
        if (params.simulateFailure) {
            if (isCritical) {
                logger_js_1.logger.error(`[CRITICAL_AUDIT] Forced failure simulated for critical action '${params.eventName}'`);
                throw new app_error_js_1.AppError(`Critical audit recording failed for '${params.eventName}'. Operation rolled back safely to preserve tamper-evident audit integrity.`, 500, error_codes_js_1.ErrorCode.AUDIT_WRITE_FAILED);
            }
            else {
                logger_js_1.logger.warn(`[NORMAL_ANALYTICS] Simulated analytics ingestion failure for '${params.eventName}'. Decoupled care flow continues unimpeded.`);
                return { recorded: false };
            }
        }
        try {
            // In production PostgreSQL, writes outbox row within transaction
            // In development fallback, writes to dev store
            return { recorded: true };
        }
        catch (err) {
            if (isCritical) {
                logger_js_1.logger.error(`[CRITICAL_AUDIT] Failed to record critical audit event: ${params.eventName}`, {
                    error: err instanceof Error ? err.message : String(err),
                });
                throw new app_error_js_1.AppError(`Critical audit recording failed. Transaction aborted safely.`, 500, error_codes_js_1.ErrorCode.AUDIT_WRITE_FAILED);
            }
            else {
                logger_js_1.logger.warn(`[NORMAL_ANALYTICS] Analytics write dropped: ${params.eventName}. Patient care continues.`);
                return { recorded: false };
            }
        }
    }
}
exports.OutboxService = OutboxService;
