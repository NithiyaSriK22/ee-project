import { logger } from '../../../config/logger.js';
import { ActorType, EventCategory } from '../admin.types.js';
import { devFallbackAdminStore } from '../dev-fallback-admin-store.js';
import { PrivacySuppressionService } from './privacy-suppression.js';

export class AnalyticsEventService {
  /**
   * Ingests a structured analytics event.
   * Decoupled from patient care: if an analytics write fails, the calling care flow continues uninterrupted.
   */
  public static async emitEvent(params: {
    eventName: string;
    category: EventCategory;
    actorType: ActorType;
    actorRef?: string;
    visitRef?: string;
    entityType: string;
    entityId?: string;
    requestId?: string;
    attributes: Record<string, any>;
    forceFailForTest?: boolean;
  }): Promise<{ accepted: boolean; eventId?: string }> {
    // 1. Strict Attribute Validation (zero clinical content, controlled keys only)
    try {
      PrivacySuppressionService.validateControlledAttributes(params.attributes);
    } catch (valErr) {
      // Attribute validation errors reject invalid events immediately
      logger.warn('[ANALYTICS_REJECTED] Prohibited attribute key or content in analytics payload', {
        eventName: params.eventName,
        error: valErr instanceof Error ? valErr.message : String(valErr),
      });
      throw valErr;
    }

    // 2. Simulated failure check for automated decoupling testing
    if (params.forceFailForTest) {
      logger.warn(
        `[ANALYTICS_DECOUPLED] Ingestion failed for '${params.eventName}'. Core clinical flow succeeds safely.`
      );
      return { accepted: false };
    }

    try {
      const stored = devFallbackAdminStore.appendAnalyticsEvent({
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
    } catch (err) {
      // Analytics failure must never break care
      logger.error('[ANALYTICS_INGESTION_ERROR] Best-effort analytics write dropped', {
        eventName: params.eventName,
        error: err instanceof Error ? err.message : String(err),
      });
      return { accepted: false };
    }
  }
}
