"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurrogateModeService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const special_populations_types_js_1 = require("./special-populations.types.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const neutral_alert_service_js_1 = require("./neutral-alert.service.js");
class SurrogateModeService {
    static surrogateRegistry = new Map();
    /**
     * Registers a surrogate respondent for an incapacitated, elderly, or unwell patient
     */
    static registerSurrogate(payload, kioskDeviceId) {
        if (!payload.visitId || !payload.patientId) {
            throw new app_error_js_1.ValidationError('visitId and patientId are required for surrogate registration');
        }
        if (!payload.surrogateName || payload.surrogateName.trim().length < 2) {
            throw new app_error_js_1.ValidationError('Valid surrogate full name is required');
        }
        const validRelationships = Object.values(special_populations_types_js_1.SurrogateRelationships);
        if (!validRelationships.includes(payload.surrogateRelationship)) {
            throw new app_error_js_1.ValidationError(`Invalid surrogate relationship. Permitted values: ${validRelationships.join(', ')}`);
        }
        const validReasons = Object.values(special_populations_types_js_1.SurrogateInabilityReasons);
        if (!validReasons.includes(payload.reasonPatientUnable)) {
            throw new app_error_js_1.ValidationError(`Invalid inability reason. Permitted values: ${validReasons.join(', ')}`);
        }
        if (!payload.patientConsentGivenOrAssumed) {
            throw new app_error_js_1.ForbiddenError('Surrogate assistance requires documented patient authorization or certified inability justification');
        }
        const provenanceLabel = `Reported by Surrogate: ${payload.surrogateName.trim()} (${payload.surrogateRelationship})`;
        const record = {
            id: crypto_1.default.randomUUID(),
            visitId: payload.visitId,
            patientId: payload.patientId,
            surrogateName: payload.surrogateName.trim(),
            surrogateRelationship: payload.surrogateRelationship,
            reasonPatientUnable: payload.reasonPatientUnable,
            provenanceLabel,
            isAcuteDistressReported: Boolean(payload.isAcuteDistressReported),
            registeredAt: new Date(),
        };
        this.surrogateRegistry.set(payload.visitId, record);
        logger_js_1.logger.info('[SURROGATE_MODE_ACTIVATED]', {
            visitId: payload.visitId,
            patientId: payload.patientId,
            reason: payload.reasonPatientUnable,
            isAcuteDistress: record.isAcuteDistressReported,
        });
        // CLINICAL DISTRESS SAFETY VALVE:
        // If surrogate notes acute physical distress or critical pain/instability, abort lengthy kiosk interview immediately!
        let emergencyRouting = false;
        let emergencyInstructions = undefined;
        if (record.isAcuteDistressReported ||
            payload.reasonPatientUnable === special_populations_types_js_1.SurrogateInabilityReasons.SEVERELY_UNWELL) {
            emergencyRouting = true;
            emergencyInstructions =
                'PATIENT IN ACUTE DISTRESS: Standard kiosk intake suspended. Please escort patient immediately to the Emergency Triage Station.';
            // Dispatch high-priority neutral alert to nursing floor staff
            neutral_alert_service_js_1.NeutralAlertService.dispatchNeutralAlert({
                visitId: payload.visitId,
                kioskDeviceId,
                alertType: 'SURROGATE_ACUTE_DISTRESS',
            });
            logger_js_1.logger.warn('[SURROGATE_EMERGENCY_ROUTING_ACTIVATED]', {
                visitId: payload.visitId,
                reason: payload.reasonPatientUnable,
            });
        }
        return {
            surrogate: { ...record },
            emergencyRouting,
            emergencyInstructions,
        };
    }
    /**
     * Retrieves active surrogate record for a visit
     */
    static getSurrogateForVisit(visitId) {
        const record = this.surrogateRegistry.get(visitId);
        return record ? { ...record } : null;
    }
    /**
     * Test/admin helper: clear store
     */
    static clearStore() {
        this.surrogateRegistry.clear();
    }
}
exports.SurrogateModeService = SurrogateModeService;
