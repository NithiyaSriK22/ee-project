"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitStateMachine = void 0;
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const dev_fallback_admin_store_js_1 = require("../admin/dev-fallback-admin-store.js");
class VisitStateMachine {
    // Allowed transitions table
    static TRANSITIONS = {
        CREATED: ['CHECKED_IN', 'CANCELLED', 'EXPIRED'],
        CHECKED_IN: ['INTAKE_IN_PROGRESS', 'PAUSED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'],
        INTAKE_IN_PROGRESS: ['INTAKE_COMPLETE', 'PAUSED', 'INTAKE_ABANDONED', 'CANCELLED', 'EXPIRED'],
        INTAKE_COMPLETE: ['READY_FOR_REVIEW', 'PAUSED', 'CANCELLED', 'EXPIRED'],
        READY_FOR_REVIEW: ['IN_CONSULTATION', 'PAUSED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'],
        IN_CONSULTATION: ['COMPLETED', 'PAUSED', 'CANCELLED'],
        PAUSED: [
            'INTAKE_IN_PROGRESS',
            'READY_FOR_REVIEW',
            'IN_CONSULTATION',
            'INTAKE_ABANDONED',
            'CANCELLED',
            'EXPIRED',
        ],
        // Terminal states
        COMPLETED: [],
        INTAKE_ABANDONED: [],
        CANCELLED: [],
        EXPIRED: [],
        NO_SHOW: [],
    };
    static canTransition(currentStatus, targetStatus) {
        if (currentStatus === targetStatus) {
            return true;
        }
        const allowed = this.TRANSITIONS[currentStatus] || [];
        return allowed.includes(targetStatus);
    }
    static validateTransition(visitId, currentStatus, targetStatus, actorRole = 'SYSTEM', actorId = 'system') {
        if (!this.canTransition(currentStatus, targetStatus)) {
            const errorMsg = `Invalid visit state transition from '${currentStatus}' to '${targetStatus}' for visit '${visitId}'`;
            logger_js_1.logger.warn('[INVALID_VISIT_STATE_TRANSITION]', {
                visitId,
                currentStatus,
                targetStatus,
                actorRole,
                actorId,
            });
            // Tamper-evident audit log of rejected state transition attempt
            try {
                dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
                    actorType: 'SYSTEM',
                    actorId,
                    actorRole,
                    action: 'INVALID_VISIT_TRANSITION_REJECTED',
                    entityType: 'VISIT',
                    entityId: visitId,
                    visitRef: visitId,
                    result: 'FAILED',
                    reasonCode: 'STATE_MACHINE_VIOLATION',
                    reasonText: errorMsg,
                    metadata: { currentStatus, targetStatus },
                });
            }
            catch {
                // Safe fallback in test mode
            }
            throw new app_error_js_1.ValidationError(errorMsg);
        }
    }
    static isTerminal(status) {
        return ['COMPLETED', 'INTAKE_ABANDONED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(status);
    }
}
exports.VisitStateMachine = VisitStateMachine;
