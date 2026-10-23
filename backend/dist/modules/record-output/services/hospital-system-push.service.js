"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HospitalSystemPushService = void 0;
const hospital_system_adapter_js_1 = require("../adapters/hospital-system.adapter.js");
const logger_js_1 = require("../../../config/logger.js");
const feature_flags_service_js_1 = require("../../deployment/feature-flags.service.js");
class HospitalSystemPushService {
    static failureQueue = new Map();
    static activeAdapterOverride;
    static MAX_RETRIES = 3;
    /**
     * Configures or overrides the active adapter (useful for testing or switching configurations).
     */
    static setAdapterOverride(adapter) {
        this.activeAdapterOverride = adapter;
    }
    /**
     * Resolves the active hospital adapter based on feature flags.
     */
    static resolveAdapter() {
        if (this.activeAdapterOverride) {
            return this.activeAdapterOverride;
        }
        if (feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('HOSPITAL_ENDPOINT_PUSH_ENABLED')) {
            return new hospital_system_adapter_js_1.EndpointHospitalSystemAdapter();
        }
        if (feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('HOSPITAL_FILE_DROP_ENABLED')) {
            return new hospital_system_adapter_js_1.FileDropHospitalSystemAdapter();
        }
        return new hospital_system_adapter_js_1.NoOpHospitalSystemAdapter();
    }
    /**
     * Dispatches a confirmed clinical record to the hospital system.
     * STRICT RESILIENCY GUARANTEE:
     * A failed push NEVER blocks doctor confirmation! Any failure is safely captured into the failure queue.
     */
    static async pushConfirmedRecord(record, contextParams) {
        const isProvisional = contextParams.identityState === 'PROVISIONAL';
        const idempotencyKey = `${record.id}-v${record.version}`;
        const adapter = this.resolveAdapter();
        const fullContext = {
            visitId: contextParams.visitId,
            patientId: contextParams.patientId,
            hospitalRegistrationNumber: isProvisional ? null : contextParams.hospitalRegistrationNumber,
            identityState: isProvisional ? 'PROVISIONAL' : 'CONFIRMED',
            idempotencyKey,
            isAmendment: Boolean(record.supersedesId || record.version > 1),
            actorId: contextParams.actorId || record.confirmedByDoctorId,
            actorRole: contextParams.actorRole || 'DOCTOR',
        };
        logger_js_1.logger.info('[HOSPITAL_SYSTEM_PUSH_INIT]', {
            recordId: record.id,
            version: record.version,
            idempotencyKey,
            adapter: adapter.name,
            isProvisional,
        });
        try {
            const result = await adapter.pushRecord(record, fullContext);
            if (!result.success) {
                // Enqueue into failure queue for admin visibility (Module 9)
                this.enqueueFailure({
                    recordId: record.id,
                    version: record.version,
                    visitId: contextParams.visitId,
                    idempotencyKey,
                    error: result.errorMessage || 'Unknown push failure',
                    identityState: fullContext.identityState,
                    needsManualHandling: isProvisional,
                });
            }
            else {
                // If it was in failure queue and now succeeded, resolve it
                if (this.failureQueue.has(idempotencyKey)) {
                    const item = this.failureQueue.get(idempotencyKey);
                    item.status = 'RESOLVED';
                }
            }
            return result;
        }
        catch (err) {
            // NON-BLOCKING RESILIENCY: Catch any unhandled adapter error and record in failure queue
            logger_js_1.logger.error('[HOSPITAL_PUSH_UNEXPECTED_ERROR] Non-blocking push error caught', {
                error: err.message,
                idempotencyKey,
            });
            this.enqueueFailure({
                recordId: record.id,
                version: record.version,
                visitId: contextParams.visitId,
                idempotencyKey,
                error: err.message || 'Fatal adapter execution error',
                identityState: fullContext.identityState,
                needsManualHandling: isProvisional,
            });
            return {
                success: false,
                adapterName: adapter.name,
                idempotencyKey,
                errorMessage: err.message,
                attemptCount: 1,
                timestamp: new Date().toISOString(),
            };
        }
    }
    /**
     * Enqueues a failed push into the admin failure queue.
     */
    static enqueueFailure(params) {
        const existing = this.failureQueue.get(params.idempotencyKey);
        const retryCount = existing ? existing.retryCount + 1 : 1;
        const status = retryCount >= this.MAX_RETRIES ? 'PERMANENTLY_FAILED' : 'PENDING_RETRY';
        const queueItem = {
            queueId: `FAIL-Q-${params.idempotencyKey}`,
            recordId: params.recordId,
            version: params.version,
            visitId: params.visitId,
            idempotencyKey: params.idempotencyKey,
            error: params.error,
            failedAt: existing ? existing.failedAt : new Date().toISOString(),
            retryCount,
            maxRetries: this.MAX_RETRIES,
            status,
            identityState: params.identityState,
            needsManualHandling: params.needsManualHandling,
            lastAttemptAt: new Date().toISOString(),
        };
        this.failureQueue.set(params.idempotencyKey, queueItem);
        logger_js_1.logger.warn('[HOSPITAL_PUSH_FAILURE_ENQUEUED]', {
            queueId: queueItem.queueId,
            retryCount,
            status,
            needsManualHandling: queueItem.needsManualHandling,
        });
        return queueItem;
    }
    /**
     * Retrieves all failure queue items for Module 9 admin monitoring.
     */
    static getFailureQueue() {
        return Array.from(this.failureQueue.values());
    }
    /**
     * Manually retries a failed push from the admin queue.
     */
    static async retryFailedItem(queueId, record, contextParams) {
        const queueItem = Array.from(this.failureQueue.values()).find((q) => q.queueId === queueId);
        if (!queueItem) {
            throw new Error(`Failure queue item '${queueId}' not found.`);
        }
        logger_js_1.logger.info('[ADMIN_MANUAL_RETRY_TRIGGERED]', { queueId });
        return this.pushConfirmedRecord(record, contextParams);
    }
    static clearFailureQueue() {
        this.failureQueue.clear();
    }
}
exports.HospitalSystemPushService = HospitalSystemPushService;
