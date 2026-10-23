import crypto from 'crypto';
import { CanonicalEvent, CanonicalEventName, OutboxMessage } from './visit.types.js';
import { CANONICAL_EVENT_CATALOG } from './event-catalog.js';
import { logger } from '../../config/logger.js';
import { devFallbackAdminStore } from '../admin/dev-fallback-admin-store.js';

export type EventConsumerHandler = (event: CanonicalEvent) => Promise<void> | void;

export class CanonicalEventBus {
  // Transactional Outbox storage
  private static outbox: OutboxMessage[] = [];

  // Dead Letter Queue
  private static deadLetterQueue: OutboxMessage[] = [];

  // Registered subscribers per event name
  private static subscribers = new Map<CanonicalEventName, EventConsumerHandler[]>();

  // De-duplication cache: Set of processed eventIds per consumer
  private static processedEvents = new Set<string>();

  // Maximum retries before moving to DLQ
  private static readonly MAX_RETRIES = 3;

  public static subscribe(eventName: CanonicalEventName, handler: EventConsumerHandler): void {
    const list = this.subscribers.get(eventName) || [];
    list.push(handler);
    this.subscribers.set(eventName, list);
  }

  public static createEvent<T = Record<string, any>>(
    eventName: CanonicalEventName,
    visitId: string,
    patientId: string,
    payload: T,
    producerOverride?: string
  ): CanonicalEvent<T> {
    const contract = CANONICAL_EVENT_CATALOG[eventName];
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
  public static async publish(event: CanonicalEvent): Promise<void> {
    const outboxId = `out_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const message: OutboxMessage = {
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
      devFallbackAdminStore.appendAuditLog({
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
    } catch {
      // Safe fallback in test mode
    }

    // Process delivery immediately (at-least-once with de-duplication)
    await this.deliverMessage(message);
  }

  private static async deliverMessage(message: OutboxMessage): Promise<void> {
    const event = message.payload as CanonicalEvent;
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
        logger.debug('[EVENT_BUS_DUPLICATE_SKIPPED]', { eventId: message.eventId, dedupeKey });
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
        } catch (err: any) {
          message.retryCount++;
          message.errorMessage = err.message || 'Consumer handler failed';
          logger.error('[EVENT_DELIVERY_FAILURE]', {
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
        logger.warn('[EVENT_SENT_TO_DLQ]', { eventId: message.eventId, eventName: message.eventName });
      }
    }
  }

  // --- Admin Dead Letter Queue & Replay Operations ---
  public static getDeadLetterQueue(): OutboxMessage[] {
    return [...this.deadLetterQueue];
  }

  public static async replayDeadLetterEvent(outboxId: string, actorId: string): Promise<boolean> {
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

    logger.info('[EVENT_DLQ_REPLAY_INITIATED]', { outboxId, eventId: message.eventId, actorId });

    // Audited replay action
    devFallbackAdminStore.appendAuditLog({
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

    if ((message.status as string) === 'DELIVERED') {
      this.deadLetterQueue.splice(idx, 1);
      return true;
    }
    return false;
  }

  // Testing helper to reset event bus state between test suites
  public static resetState(): void {
    this.outbox = [];
    this.deadLetterQueue = [];
    this.subscribers.clear();
    this.processedEvents.clear();
  }
}
