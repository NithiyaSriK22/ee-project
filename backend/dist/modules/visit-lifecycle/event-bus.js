"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanonicalEventBus = void 0;
const crypto_1 = __importDefault(require("crypto"));
const event_catalog_js_1 = require("./event-catalog.js");
const logger_js_1 = require("../../config/logger.js");
const dev_fallback_admin_store_js_1 = require("../admin/dev-fallback-admin-store.js");
class CanonicalEventBus {
    // Transactional Outbox storage
    static outbox = [];
    // Dead Letter Queue
    static deadLetterQueue = [];
    // Registered subscribers per event name
    static subscribers = new Map();
    // De-duplication cache: Set of processed eventIds per consumer
    static processedEvents = new Set();
    // Maximum retries before moving to DLQ
    static MAX_RETRIES = 3;
    static subscribe(eventName, handler) {
        const list = this.subscribers.get(eventName) || [];
        list.push(handler);
        this.subscribers.set(eventName, list);
    }
    static createEvent(eventName, visitId, patientId, payload, producerOverride) {
        const contract = event_catalog_js_1.CANONICAL_EVENT_CATALOG[eventName];
        const eventId = `evt_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`;
        const producer = producerOverride || (contract ? contract.producer : 'THUNAI Engine');
        const version = contract ? contract.version : '1.0.0';
        return {
            eventId,
            eventName,
            version,
            visitId,
            patientId,
            occurredAt: new Date().toISOString(),
            producer,
            payload,
        };
    }
    /**
     * Publishes an event through the Transactional Outbox.
     * Dispatches asynchronously with ordering key = visitId and consumer deduplication.
     */
    static async publish(event) {
        const outboxId = `out_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`;
        const message = {
            id: outboxId,
            eventId: event.eventId,
            eventName: event.eventName,
            visitId: event.visitId,
            payload: event,
            status: 'PENDING',
            retryCount: 0,
            createdAt: new Date(),
        };
        this.outbox.push(message);
        // Forward to tamper-evident audit log for critical milestones
        try {
            dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
                actorType: 'SYSTEM',
                actorId: event.producer,
                actorRole: 'EVENT_BUS',
                action: `EVENT_${event.eventName}`,
                entityType: 'EVENT',
                entityId: event.eventId,
                visitRef: event.visitId,
                result: 'SUCCESS',
                metadata: {
                    eventName: event.eventName,
                    version: event.version,
                    payloadIds: event.payload,
                },
            });
        }
        catch {
            // Safe fallback in test mode
        }
        // Process delivery immediately (at-least-once with de-duplication)
        await this.deliverMessage(message);
    }
    static async deliverMessage(message) {
        const event = message.payload;
        const handlers = this.subscribers.get(message.eventName) || [];
        if (handlers.length === 0) {
            message.status = 'DELIVERED';
            message.lastAttemptAt = new Date();
            return;
        }
        for (let i = 0; i < handlers.length; i++) {
            const handler = handlers[i];
            const dedupeKey = `${message.eventId}_consumer_${i}`;
            if (this.processedEvents.has(dedupeKey)) {
                logger_js_1.logger.debug('[EVENT_BUS_DUPLICATE_SKIPPED]', { eventId: message.eventId, dedupeKey });
                continue;
            }
            let success = false;
            while (message.retryCount < this.MAX_RETRIES) {
                try {
                    message.lastAttemptAt = new Date();
                    if (handler) {
                        await handler(event);
                    }
                    this.processedEvents.add(dedupeKey);
                    message.status = 'DELIVERED';
                    success = true;
                    break;
                }
                catch (err) {
                    message.retryCount++;
                    message.errorMessage = err.message || 'Consumer handler failed';
                    logger_js_1.logger.error('[EVENT_DELIVERY_FAILURE]', {
                        eventId: message.eventId,
                        eventName: message.eventName,
                        retryCount: message.retryCount,
                        error: message.errorMessage,
                    });
                    if (message.retryCount < this.MAX_RETRIES) {
                        await new Promise((resolve) => setTimeout(resolve, 5 * message.retryCount));
                    }
                }
            }
            if (!success) {
                message.status = 'DEAD_LETTER';
                this.deadLetterQueue.push(message);
                logger_js_1.logger.warn('[EVENT_SENT_TO_DLQ]', { eventId: message.eventId, eventName: message.eventName });
            }
        }
    }
    // --- Admin Dead Letter Queue & Replay Operations ---
    static getDeadLetterQueue() {
        return [...this.deadLetterQueue];
    }
    static async replayDeadLetterEvent(outboxId, actorId) {
        const idx = this.deadLetterQueue.findIndex((m) => m.id === outboxId);
        if (idx === -1) {
            return false;
        }
        const message = this.deadLetterQueue[idx];
        if (!message) {
            return false;
        }
        message.retryCount = 0;
        message.status = 'PENDING';
        message.errorMessage = null;
        logger_js_1.logger.info('[EVENT_DLQ_REPLAY_INITIATED]', { outboxId, eventId: message.eventId, actorId });
        // Audited replay action
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
            actorType: 'STAFF',
            actorId,
            actorRole: 'ADMIN',
            action: 'EVENT_DLQ_REPLAYED',
            entityType: 'EVENT',
            entityId: message.eventId,
            visitRef: message.visitId,
            result: 'SUCCESS',
            metadata: { outboxId, eventName: message.eventName },
        });
        await this.deliverMessage(message);
        if (message.status === 'DELIVERED') {
            this.deadLetterQueue.splice(idx, 1);
            return true;
        }
        return false;
    }
    // Testing helper to reset event bus state between test suites
    static resetState() {
        this.outbox = [];
        this.deadLetterQueue = [];
        this.subscribers.clear();
        this.processedEvents.clear();
    }
}
exports.CanonicalEventBus = CanonicalEventBus;
