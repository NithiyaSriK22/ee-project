"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionService = void 0;
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
const dev_fallback_admin_store_js_1 = require("../dev-fallback-admin-store.js");
const audit_service_js_1 = require("../audit/audit.service.js");
class RetentionService {
    /**
     * Retrieves current retention configurations and legal holds.
     * Explicitly returns the open governance decision notice.
     */
    static async getRetentionOverview() {
        return {
            settings: dev_fallback_admin_store_js_1.devFallbackAdminStore.getRetentionSettings(),
            legalHolds: dev_fallback_admin_store_js_1.devFallbackAdminStore.getLegalHolds(),
            governanceNotice: 'IMPORTANT GOVERNANCE NOTICE: Health-record access audit log retention duration is a hospital policy and medico-legal decision. The default policy of 7 years (2,555 days) must be reviewed and formally signed off by hospital legal counsel, medical records committee, and clinical leads prior to live deployment.',
        };
    }
    /**
     * Updates a retention setting policy. Audited as a critical configuration action.
     */
    static async updateRetentionSetting(params) {
        if (params.settingValue < 1) {
            throw new app_error_js_1.AppError('Retention period must be a positive integer value.', 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR);
        }
        const updated = dev_fallback_admin_store_js_1.devFallbackAdminStore.updateRetentionSetting(params.settingKey, params.settingValue, params.updatedBy);
        await audit_service_js_1.AuditService.recordAudit({
            actorType: 'STAFF',
            actorId: params.updatedBy,
            actorRole: params.userRole,
            action: 'RETENTION_SETTING_UPDATED',
            entityType: 'RETENTION_SETTING',
            entityId: params.settingKey,
            result: 'SUCCESS',
            metadata: {
                setting_key: params.settingKey,
                new_retention_days: params.settingValue,
            },
        });
        return updated;
    }
    /**
     * Places a legal hold to immediately suspend all automated data pruning for the given scope.
     */
    static async placeLegalHold(params) {
        if (!params.reason || params.reason.trim().length < 10) {
            throw new app_error_js_1.AppError('A comprehensive legal justification reason (minimum 10 characters) is required to place a legal hold.', 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR);
        }
        const hold = dev_fallback_admin_store_js_1.devFallbackAdminStore.placeLegalHold({
            scope: params.scope,
            reason: params.reason,
            placedBy: params.placedBy,
        });
        await audit_service_js_1.AuditService.recordAudit({
            actorType: 'STAFF',
            actorId: params.placedBy,
            actorRole: params.userRole,
            action: 'LEGAL_HOLD_SET',
            entityType: 'LEGAL_HOLD',
            entityId: hold.id,
            result: 'SUCCESS',
            reasonText: params.reason,
            metadata: { scope: params.scope },
        });
        return hold;
    }
    /**
     * Releases an active legal hold.
     */
    static async releaseLegalHold(params) {
        const hold = dev_fallback_admin_store_js_1.devFallbackAdminStore.releaseLegalHold(params.holdId, params.releasedBy);
        if (!hold) {
            throw new app_error_js_1.AppError('Legal hold not found', 404, error_codes_js_1.ErrorCode.NOT_FOUND);
        }
        await audit_service_js_1.AuditService.recordAudit({
            actorType: 'STAFF',
            actorId: params.releasedBy,
            actorRole: params.userRole,
            action: 'LEGAL_HOLD_RELEASED',
            entityType: 'LEGAL_HOLD',
            entityId: hold.id,
            result: 'SUCCESS',
            metadata: { scope: hold.scope },
        });
        return hold;
    }
}
exports.RetentionService = RetentionService;
