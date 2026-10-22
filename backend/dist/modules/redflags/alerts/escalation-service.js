"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationService = exports.DEFAULT_ESCALATION_CONFIG = void 0;
const redflags_types_js_1 = require("../redflags.types.js");
exports.DEFAULT_ESCALATION_CONFIG = {
    immediateTimeoutSeconds: 180, // 3 minutes
    manualTimeoutSeconds: 120, // 2 minutes
    urgentTimeoutSeconds: 600, // 10 minutes
    staffCheckTimeoutSeconds: 1200, // 20 minutes
};
class EscalationService {
    /**
     * Calculates whether an unacknowledged alert has expired its SLA and requires escalation
     */
    static shouldEscalate(severityTier, status, raisedAt, config = exports.DEFAULT_ESCALATION_CONFIG, now = new Date()) {
        // Only unacknowledged or stalled alerts escalate
        if (status !== redflags_types_js_1.AlertStatuses.RAISED) {
            return false;
        }
        const elapsedSeconds = (now.getTime() - raisedAt.getTime()) / 1000;
        const threshold = this.getThresholdSeconds(severityTier, config);
        return elapsedSeconds >= threshold;
    }
    static getThresholdSeconds(tier, config = exports.DEFAULT_ESCALATION_CONFIG) {
        switch (tier) {
            case redflags_types_js_1.SeverityTiers.IMMEDIATE:
                return config.immediateTimeoutSeconds;
            case redflags_types_js_1.SeverityTiers.MANUAL:
                return config.manualTimeoutSeconds;
            case redflags_types_js_1.SeverityTiers.URGENT:
                return config.urgentTimeoutSeconds;
            case redflags_types_js_1.SeverityTiers.STAFF_CHECK:
                return config.staffCheckTimeoutSeconds;
            default:
                return 600;
        }
    }
}
exports.EscalationService = EscalationService;
