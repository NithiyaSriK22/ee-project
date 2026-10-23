import { ConfirmedRecordDTO } from '../../doctor-review/doctor-review.types.js';
import {
  HospitalSystemAdapter,
  HospitalPushContext,
  HospitalPushResult,
  HospitalFailureQueueItem,
} from '../record-output.types.js';
import {
  NoOpHospitalSystemAdapter,
  FileDropHospitalSystemAdapter,
  EndpointHospitalSystemAdapter,
} from '../adapters/hospital-system.adapter.js';
import { logger } from '../../../config/logger.js';
import { FeatureFlagsService } from '../../deployment/feature-flags.service.js';

export class HospitalSystemPushService {
  private static failureQueue: Map<string, HospitalFailureQueueItem> = new Map();
  private static activeAdapterOverride?: HospitalSystemAdapter;
  private static readonly MAX_RETRIES = 3;

  /**
   * Configures or overrides the active adapter (useful for testing or switching configurations).
   */
  public static setAdapterOverride(adapter?: HospitalSystemAdapter): void {
    this.activeAdapterOverride = adapter;
  }

  /**
   * Resolves the active hospital adapter based on feature flags.
   */
  public static resolveAdapter(): HospitalSystemAdapter {
    if (this.activeAdapterOverride) {
      return this.activeAdapterOverride;
    }

    if (FeatureFlagsService.isFlagEnabled('HOSPITAL_ENDPOINT_PUSH_ENABLED')) {
      return new EndpointHospitalSystemAdapter();
    }

    if (FeatureFlagsService.isFlagEnabled('HOSPITAL_FILE_DROP_ENABLED')) {
      return new FileDropHospitalSystemAdapter();
    }

    return new NoOpHospitalSystemAdapter();
  }

  /**
   * Dispatches a confirmed clinical record to the hospital system.
   * STRICT RESILIENCY GUARANTEE:
   * A failed push NEVER blocks doctor confirmation! Any failure is safely captured into the failure queue.
   */
  public static async pushConfirmedRecord(
    record: ConfirmedRecordDTO,
    contextParams: {
      visitId: string;
      patientId: string;
      hospitalRegistrationNumber?: string | null;
      identityState?: 'CONFIRMED' | 'PROVISIONAL';
      actorId?: string;
      actorRole?: string;
    }
  ): Promise<HospitalPushResult> {
    const isProvisional = contextParams.identityState === 'PROVISIONAL';
    const idempotencyKey = `${record.id}-v${record.version}`;
    const adapter = this.resolveAdapter();

    const fullContext: HospitalPushContext = {
      visitId: contextParams.visitId,
      patientId: contextParams.patientId,
      hospitalRegistrationNumber: isProvisional ? null : contextParams.hospitalRegistrationNumber,
      identityState: isProvisional ? 'PROVISIONAL' : 'CONFIRMED',
      idempotencyKey,
      isAmendment: Boolean(record.supersedesId || record.version > 1),
      actorId: contextParams.actorId || record.confirmedByDoctorId,
      actorRole: contextParams.actorRole || 'DOCTOR',
    };

    logger.info('[HOSPITAL_SYSTEM_PUSH_INIT]', {
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
      } else {
        // If it was in failure queue and now succeeded, resolve it
        if (this.failureQueue.has(idempotencyKey)) {
          const item = this.failureQueue.get(idempotencyKey)!;
          item.status = 'RESOLVED';
        }
      }

      return result;
    } catch (err: any) {
      // NON-BLOCKING RESILIENCY: Catch any unhandled adapter error and record in failure queue
      logger.error('[HOSPITAL_PUSH_UNEXPECTED_ERROR] Non-blocking push error caught', {
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
  private static enqueueFailure(params: {
    recordId: string;
    version: number;
    visitId: string;
    idempotencyKey: string;
    error: string;
    identityState: 'CONFIRMED' | 'PROVISIONAL';
    needsManualHandling: boolean;
  }): HospitalFailureQueueItem {
    const existing = this.failureQueue.get(params.idempotencyKey);
    const retryCount = existing ? existing.retryCount + 1 : 1;
    const status = retryCount >= this.MAX_RETRIES ? 'PERMANENTLY_FAILED' : 'PENDING_RETRY';

    const queueItem: HospitalFailureQueueItem = {
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

    logger.warn('[HOSPITAL_PUSH_FAILURE_ENQUEUED]', {
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
  public static getFailureQueue(): HospitalFailureQueueItem[] {
    return Array.from(this.failureQueue.values());
  }

  /**
   * Manually retries a failed push from the admin queue.
   */
  public static async retryFailedItem(
    queueId: string,
    record: ConfirmedRecordDTO,
    contextParams: {
      visitId: string;
      patientId: string;
      hospitalRegistrationNumber?: string | null;
      identityState?: 'CONFIRMED' | 'PROVISIONAL';
      actorId?: string;
      actorRole?: string;
    }
  ): Promise<HospitalPushResult> {
    const queueItem = Array.from(this.failureQueue.values()).find((q) => q.queueId === queueId);
    if (!queueItem) {
      throw new Error(`Failure queue item '${queueId}' not found.`);
    }

    logger.info('[ADMIN_MANUAL_RETRY_TRIGGERED]', { queueId });
    return this.pushConfirmedRecord(record, contextParams);
  }

  public static clearFailureQueue(): void {
    this.failureQueue.clear();
  }
}
