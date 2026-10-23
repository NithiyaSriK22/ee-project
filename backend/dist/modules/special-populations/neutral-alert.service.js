"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeutralAlertService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = require("../../config/logger.js");
const sse_broadcaster_js_1 = require("../redflags/alerts/sse-broadcaster.js");
class NeutralAlertService {
    static dispatchedAlerts = new Map();
    /**
     * Dispatches a staff notification while strictly enforcing the Zero PHI Rule
     */
    static dispatchNeutralAlert(request) {
        const alertId = crypto_1.default.randomUUID();
        const kioskLocation = request.kioskBayLocation || (request.kioskDeviceId ? `Kiosk ${request.kioskDeviceId.substring(0, 8)}` : 'OPD Intake Kiosk');
        let neutralMessage = `Please assist the patient at ${kioskLocation}.`;
        let severityTier = 'TIER_2_URGENT';
        if (request.alertType === 'SURROGATE_ACUTE_DISTRESS') {
            neutralMessage = `URGENT: Staff escort requested to assist patient at ${kioskLocation}.`;
            severityTier = 'TIER_1_CRITICAL';
        }
        else if (request.alertType === 'SENSITIVE_ASSISTANCE_REQUESTED') {
            neutralMessage = `Discreet patient assistance requested at ${kioskLocation}.`;
            severityTier = 'TIER_2_URGENT';
        }
        else if (request.alertType === 'CRITICAL_DISCLOSURE_FLAGGED') {
            neutralMessage = `Clinical staff check requested for patient at ${kioskLocation}.`;
            severityTier = 'TIER_2_URGENT';
        }
        const payload = {
            alertId,
            visitId: request.visitId,
            kioskDeviceId: request.kioskDeviceId,
            kioskLocation,
            neutralMessage,
            severityTier,
            dispatchedAt: new Date(),
            isNeutralSanitized: true,
        };
        const existing = this.dispatchedAlerts.get(request.visitId) || [];
        existing.push(payload);
        this.dispatchedAlerts.set(request.visitId, existing);
        // Broadcast over SSE with neutral payload
        try {
            sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:raised', {
                id: alertId,
                visitId: request.visitId,
                kioskDeviceId: request.kioskDeviceId,
                kioskLocation,
                ruleCode: 'NEUTRAL_SENSITIVE_DISCLOSURE',
                severityTier,
                triggerType: 'MANUAL',
                status: 'RAISED',
                escalationLevel: 0,
                ruleDescription: 'Patient assistance requested at intake kiosk',
                recommendedStaffAction: neutralMessage,
                evidences: [],
                events: [],
                raisedAt: payload.dispatchedAt.toISOString(),
                createdAt: payload.dispatchedAt.toISOString(),
                updatedAt: payload.dispatchedAt.toISOString(),
            });
        }
        catch (broadcastErr) {
            logger_js_1.logger.warn('[NEUTRAL_ALERT_BROADCAST_SKIPPED]', { error: String(broadcastErr) });
        }
        logger_js_1.logger.info('[NEUTRAL_ALERT_DISPATCHED_ZERO_PHI]', {
            alertId,
            visitId: request.visitId,
            severityTier,
            kioskLocation,
            // CRITICAL: We log ONLY the sanitized neutral message, NEVER sensitive PHI!
            sanitizedMessage: neutralMessage,
        });
        return { ...payload };
    }
    /**
     * Retrieves sanitized alerts for a visit
     */
    static getAlertsForVisit(visitId) {
        const list = this.dispatchedAlerts.get(visitId) || [];
        return list.map((a) => ({ ...a }));
    }
    /**
     * Test/admin helper: clear store
     */
    static clearStore() {
        this.dispatchedAlerts.clear();
    }
}
exports.NeutralAlertService = NeutralAlertService;
