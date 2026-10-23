"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionGuardService = void 0;
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
const logger_js_1 = require("../../../config/logger.js");
const env_config_js_1 = require("../../../config/env.config.js");
class ProductionGuardService {
    /**
     * Asserts that synthetic generation/demo execution is permitted in the current environment.
     * Throws ErrorCode.SYNTHETIC_DATA_BLOCKED_IN_PRODUCTION if run in production.
     */
    static assertSyntheticPermitted() {
        if (env_config_js_1.env.NODE_ENV === 'production') {
            logger_js_1.logger.error('[PRODUCTION_GUARD_VIOLATION] Attempted to invoke synthetic generator in production environment!');
            throw new app_error_js_1.AppError('Synthetic data seeding and demo execution are strictly prohibited in production environments.', 403, error_codes_js_1.ErrorCode.SYNTHETIC_DATA_BLOCKED_IN_PRODUCTION);
        }
    }
    /**
     * Asserts that demo mode is permitted.
     */
    static assertDemoModePermitted() {
        if (env_config_js_1.env.NODE_ENV === 'production') {
            logger_js_1.logger.error('[PRODUCTION_GUARD_VIOLATION] Demo mode activation blocked in production environment!');
            throw new app_error_js_1.AppError('Demo mode is strictly prohibited in production environments.', 403, error_codes_js_1.ErrorCode.DEMO_MODE_BLOCKED_IN_PRODUCTION);
        }
    }
    /**
     * Checks whether a record is synthetic.
     */
    static isSyntheticRecord(record) {
        if (record.isSynthetic === true)
            return true;
        if (record.hospitalRegistrationNumber?.startsWith('SYN-'))
            return true;
        if (record.id?.includes('syn_') || record.id?.includes('SYNTH-'))
            return true;
        return false;
    }
    /**
     * Filters out synthetic records from production analytics cohorts.
     */
    static sanitizeAnalyticsCohort(items) {
        return items.filter((item) => !this.isSyntheticRecord(item));
    }
}
exports.ProductionGuardService = ProductionGuardService;
