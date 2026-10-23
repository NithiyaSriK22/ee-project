"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const logger_js_1 = require("../../../config/logger.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
const dev_fallback_admin_store_js_1 = require("../dev-fallback-admin-store.js");
const privacy_suppression_js_1 = require("../analytics/privacy-suppression.js");
const outbox_service_js_1 = require("./outbox.service.js");
class AuditService {
    /**
     * Appends an immutable, hash-chained record to the audit trail.
     * If action is in CRITICAL_AUDIT_ACTIONS, failures roll back safely.
     */
    static async recordAudit(params) {
        // 1. Validate controlled metadata attributes to ensure zero clinical content
        if (params.metadata) {
            privacy_suppression_js_1.PrivacySuppressionService.validateControlledAttributes(params.metadata);
        }
        const result = params.result || 'SUCCESS';
        const isCritical = outbox_service_js_1.CRITICAL_AUDIT_ACTIONS.has(params.action);
        // 2. Transactional outbox fail-safe evaluation
        if (params.forceFailForTest && isCritical) {
            await outbox_service_js_1.OutboxService.recordEvent({
                eventName: params.action,
                eventClass: 'CRITICAL_AUDIT',
                payload: { entityType: params.entityType, entityId: params.entityId },
                simulateFailure: true,
            });
        }
        try {
            const entry = dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
                actorType: params.actorType,
                actorId: params.actorId,
                actorRole: params.actorRole,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                visitRef: params.visitRef,
                result,
                reasonCode: params.reasonCode,
                reasonText: params.reasonText,
                requestId: params.requestId,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                metadata: params.metadata,
                occurredAt: params.occurredAt,
            });
            logger_js_1.logger.info(`[AUDIT_LOG_APPENDED] #${entry.sequenceNumber} - ${params.action}`, {
                sequenceNumber: entry.sequenceNumber,
                action: params.action,
                entityType: params.entityType,
                actorRole: params.actorRole,
                result,
            });
            return entry;
        }
        catch (err) {
            if (isCritical) {
                throw new app_error_js_1.AppError(`Failed to persist critical audit record: ${err instanceof Error ? err.message : String(err)}`, 500, error_codes_js_1.ErrorCode.AUDIT_WRITE_FAILED);
            }
            logger_js_1.logger.error('Failed to write non-critical audit log', { error: String(err) });
            throw err;
        }
    }
    /**
     * Search audit trail with role-based field masking.
     * IP address, User Agent, and free-text reasons are strictly restricted to AUDITOR and SUPER_ADMIN.
     */
    static async searchAuditLogs(query, requestingUserRole, requestingUserId) {
        const hasPrivilegedAccess = requestingUserRole === 'AUDITOR' || requestingUserRole === 'SUPER_ADMIN';
        const { logs, total } = dev_fallback_admin_store_js_1.devFallbackAdminStore.getAuditLogs(query);
        // Audit the viewing of audit logs
        this.recordAudit({
            actorType: 'STAFF',
            actorId: requestingUserId,
            actorRole: requestingUserRole,
            action: 'AUDIT_LOG_VIEWED',
            entityType: 'AUDIT_LOG',
            result: 'SUCCESS',
            metadata: { count: logs.length },
        }).catch(() => { });
        // Apply role-based field masking
        const sanitizedLogs = logs.map((log) => {
            if (hasPrivilegedAccess) {
                return log;
            }
            // Non-auditors receive sanitized view without IP, user-agent, or protected justification reasons
            const { ipAddress, userAgent, reasonText, ...safeLog } = log;
            return {
                ...safeLog,
                ipAddress: '[RESTRICTED_TO_AUDITOR]',
                userAgent: '[RESTRICTED_TO_AUDITOR]',
                reasonText: reasonText ? '[RESTRICTED_JUSTIFICATION_NOTE]' : undefined,
            };
        });
        return {
            logs: sanitizedLogs,
            total,
            restrictedFieldsIncluded: hasPrivilegedAccess,
        };
    }
    /**
     * Retrieves single audit record by ID with role-based field masking
     */
    static async getAuditLogById(id, requestingUserRole) {
        const log = dev_fallback_admin_store_js_1.devFallbackAdminStore.getAuditLogById(id);
        if (!log) {
            throw new app_error_js_1.AppError('Audit log entry not found', 404, error_codes_js_1.ErrorCode.NOT_FOUND);
        }
        const hasPrivilegedAccess = requestingUserRole === 'AUDITOR' || requestingUserRole === 'SUPER_ADMIN';
        if (hasPrivilegedAccess) {
            return log;
        }
        const { ipAddress, userAgent, reasonText, ...safeLog } = log;
        return {
            ...safeLog,
            ipAddress: '[RESTRICTED_TO_AUDITOR]',
            userAgent: '[RESTRICTED_TO_AUDITOR]',
            reasonText: reasonText ? '[RESTRICTED_JUSTIFICATION_NOTE]' : undefined,
        };
    }
    /**
     * Verifies SHA-256 hash chaining across all audit records and creates verification checkpoint.
     */
    static verifyAuditChain() {
        return dev_fallback_admin_store_js_1.devFallbackAdminStore.verifyAuditChain();
    }
}
exports.AuditService = AuditService;
