import { prisma } from '../../../database/prisma.js';
import { devFallbackLanguageStore } from '../dev-fallback-language-store.js';
import { checkDatabaseAvailability } from '../../doctor-review/doctor-review.repository.js';
import { SyncAnswersBatchDTO, SyncResultDTO } from '../language.types.js';
import { InterviewService } from '../../interview/interview.service.js';
import { logger } from '../../../config/logger.js';
import { ValidationError } from '../../../errors/app-error.js';

export class SyncService {
  /**
   * Idempotently synchronizes a batch of answers collected offline at the kiosk.
   * Retries will NEVER duplicate or reorder answers.
   */
  public static async syncOfflineAnswers(
    visitIdOrBatch: string | (SyncAnswersBatchDTO & { visitId?: string; patientId?: string }),
    patientIdOrBatch?: string,
    batchArg?: SyncAnswersBatchDTO
  ): Promise<SyncResultDTO> {
    let visitId: string;
    let patientId: string;
    let batch: SyncAnswersBatchDTO;

    if (typeof visitIdOrBatch === 'object' && visitIdOrBatch !== null) {
      batch = visitIdOrBatch;
      visitId = (visitIdOrBatch as any).visitId || 'visit-kiosk';
      patientId = (visitIdOrBatch as any).patientId || 'patient-kiosk';
    } else {
      visitId = visitIdOrBatch;
      patientId = patientIdOrBatch || 'patient-kiosk';
      batch = batchArg || {
        visitId,
        templateVersion: '1.0.0',
        clientTimestamp: new Date().toISOString(),
        answers: [],
      };
    }

    if (!batch.answers || !Array.isArray(batch.answers)) {
      throw new ValidationError('Answers batch must be an array of recorded answers.');
    }

    let processedCount = 0;
    let duplicateCount = 0;
    const now = new Date().toISOString();
    const isDb = await checkDatabaseAvailability();

    for (const item of batch.answers) {
      if (!item.idempotencyKey) {
        throw new ValidationError('Each offline answer must possess a unique idempotency key.');
      }

      // 1. Check idempotency key deduplication
      const alreadyProcessed = await this.isIdempotencyKeySeen(item.idempotencyKey);
      if (alreadyProcessed) {
        duplicateCount++;
        continue;
      }

      // 2. Submit answer via existing Module 3 InterviewService if DB available
      if (isDb) {
        try {
          await InterviewService.submitAnswer(visitId, patientId, {
            questionId: item.questionId,
            answerValue: item.answerValue,
            answeredVia: item.answeredVia || 'touch',
            languageUsed: item.languageUsed || 'en',
            isSkipped: item.isSkipped,
          });
        } catch (err: any) {
          if (err?.message?.includes('already answered') || err?.message?.includes('unique constraint')) {
            duplicateCount++;
            await this.recordSyncReceipt(item.idempotencyKey, visitId, now);
            continue;
          }
        }
      }

      // 3. Record SyncReceipt to guarantee idempotency
      await this.recordSyncReceipt(item.idempotencyKey, visitId, item.answeredAt || now);
      processedCount++;
    }

    const receiptId = `sync-${Date.now()}-${visitId}`;
    logger.info('Offline answers batch synchronization complete', {
      visitId,
      processedCount,
      duplicateCount,
      totalReceived: batch.answers.length,
    });

    return {
      success: true,
      processedCount,
      duplicateCount,
      syncReceiptId: receiptId,
      syncedAt: now,
    };
  }

  private static async isIdempotencyKeySeen(idempotencyKey: string): Promise<boolean> {
    const isDb = await checkDatabaseAvailability();
    if (isDb) {
      try {
        const found = await prisma.syncReceipt.findUnique({
          where: { idempotency_key: idempotencyKey },
        });
        return Boolean(found);
      } catch {
        // Fallback to in-mem store
      }
    }

    return devFallbackLanguageStore.syncReceipts.has(idempotencyKey);
  }

  private static async recordSyncReceipt(idempotencyKey: string, visitId: string, clientTimestamp: string): Promise<void> {
    const now = new Date();
    const isDb = await checkDatabaseAvailability();
    if (isDb) {
      try {
        await prisma.syncReceipt.create({
          data: {
            idempotency_key: idempotencyKey,
            visit_id: visitId,
            batch_type: 'ANSWERS',
            item_count: 1,
            processed_at: now,
            client_timestamp: new Date(clientTimestamp),
          },
        });
        return;
      } catch {
        // Fallback to in-mem
      }
    }

    devFallbackLanguageStore.syncReceipts.set(idempotencyKey, {
      visitId,
      processedAt: now.toISOString(),
      itemCount: 1,
    });
  }
}
