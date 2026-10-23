"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEventService = void 0;
const logger_js_1 = require("../../../config/logger.js");
const dev_fallback_admin_store_js_1 = require("../dev-fallback-admin-store.js");
const privacy_suppression_js_1 = require("./privacy-suppression.js");
class AnalyticsEventService {
    /**
     * Ingests a structured analytics event.
     * Decoupled from patient care: if an analytics write fails, the calling care flow continues uninterrupted.
     */
    static async emitEvent(params) {
        // 1. Strict Attribute Validation (zero clinical content, controlled keys only)
        try {
            privacy_suppression_js_1.PrivacySuppressionService.validateControlledAttributes(params.attributes);
        }
        catch (valErr) {
            // Attribute validation errors reject invalid events immediately
            logger_js_1.logger.warn('[ANALYTICS_REJECTED] Prohibited attribute key or content in analytics payload', {
                eventName: params.eventName,
                error: valErr instanceof Error ? valErr.message : String(valErr),
            });
            throw valErr;
        }
        // 2. Simulated failure check for automated decoupling testing
        if (params.forceFailForTest) {
            logger_js_1.logger.warn(`[ANALYTICS_DECOUPLED] Ingestion failed for '${params.eventName}'. Core clinical flow succeeds safely.`);
            return { accepted: false };
        }
        try {
            const stored = dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAnalyticsEvent({
                eventName: params.eventName,
                category: params.category,
                actorType: params.actorType,
                actorRef: params.actorRef,
                visitRef: params.visitRef,
                entityType: params.entityType,
                entityId: params.entityId,
                requestId: params.requestId,
                attributes: params.attributes,
            });
            return { accepted: true, eventId: stored.id };
        }
        catch (err) {
            // Analytics failure must never break care
            logger_js_1.logger.error('[ANALYTICS_INGESTION_ERROR] Best-effort analytics write dropped', {
                eventName: params.eventName,
                error: err instanceof Error ? err.message : String(err),
            });
            return { accepted: false };
        }
    }
}
exports.AnalyticsEventService = AnalyticsEventService;
