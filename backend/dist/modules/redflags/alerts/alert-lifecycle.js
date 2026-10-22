"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertLifecycle = void 0;
const redflags_types_js_1 = require("../redflags.types.js");
const app_error_js_1 = require("../../../errors/app-error.js");
class AlertLifecycle {
    static VALID_TRANSITIONS = {
        [redflags_types_js_1.AlertStatuses.RAISED]: [
            redflags_types_js_1.AlertStatuses.ACKNOWLEDGED,
            redflags_types_js_1.AlertStatuses.ESCALATED,
        ],
        [redflags_types_js_1.AlertStatuses.ACKNOWLEDGED]: [
            redflags_types_js_1.AlertStatuses.IN_ASSESSMENT,
            redflags_types_js_1.AlertStatuses.RESOLVED,
            redflags_types_js_1.AlertStatuses.DISMISSED,
            redflags_types_js_1.AlertStatuses.ESCALATED,
        ],
        [redflags_types_js_1.AlertStatuses.IN_ASSESSMENT]: [
            redflags_types_js_1.AlertStatuses.RESOLVED,
            redflags_types_js_1.AlertStatuses.DISMISSED,
            redflags_types_js_1.AlertStatuses.ESCALATED,
        ],
        [redflags_types_js_1.AlertStatuses.ESCALATED]: [
            redflags_types_js_1.AlertStatuses.ACKNOWLEDGED,
            redflags_types_js_1.AlertStatuses.IN_ASSESSMENT,
            redflags_types_js_1.AlertStatuses.RESOLVED,
            redflags_types_js_1.AlertStatuses.DISMISSED,
        ],
        [redflags_types_js_1.AlertStatuses.RESOLVED]: [], // Terminal state
        [redflags_types_js_1.AlertStatuses.DISMISSED]: [], // Terminal state
    };
    /**
     * Validates if transition from currentStatus to nextStatus is permitted
     */
    static validateTransition(currentStatus, nextStatus) {
        if (currentStatus === nextStatus)
            return;
        const allowed = this.VALID_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(nextStatus)) {
            throw new app_error_js_1.ValidationError(`Invalid alert lifecycle transition: Cannot move alert from '${currentStatus}' to '${nextStatus}'. Alerts must be acknowledged before resolution.`);
        }
    }
    /**
     * Validates dismissal parameters
     */
    static validateDismissal(reason) {
        const valid = Object.values(redflags_types_js_1.ControlledDismissalReasons).includes(reason);
        if (!valid) {
            throw new app_error_js_1.ValidationError(`Invalid dismissal reason: '${reason}'. Controlled reason from catalog required: ${Object.values(redflags_types_js_1.ControlledDismissalReasons).join(', ')}`);
        }
        return reason;
    }
    /**
     * Validates resolution parameters
     */
    static validateResolution(type) {
        const valid = Object.values(redflags_types_js_1.ControlledResolutionTypes).includes(type);
        if (!valid) {
            throw new app_error_js_1.ValidationError(`Invalid resolution type: '${type}'. Controlled resolution type required: ${Object.values(redflags_types_js_1.ControlledResolutionTypes).join(', ')}`);
        }
        return type;
    }
}
exports.AlertLifecycle = AlertLifecycle;
