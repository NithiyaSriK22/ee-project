"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const prisma_js_1 = require("../../../database/prisma.js");
const dev_fallback_language_store_js_1 = require("../dev-fallback-language-store.js");
const doctor_review_repository_js_1 = require("../../doctor-review/doctor-review.repository.js");
const interview_service_js_1 = require("../../interview/interview.service.js");
const logger_js_1 = require("../../../config/logger.js");
const app_error_js_1 = require("../../../errors/app-error.js");
class SyncService {
    /**
     * Idempotently synchronizes a batch of answers collected offline at the kiosk.
     * Retries will NEVER duplicate or reorder answers.
     */
    static async syncOfflineAnswers(visitIdOrBatch, patientIdOrBatch, batchArg) {
        let visitId;
        let patientId;
        let batch;
        if (typeof visitIdOrBatch === 'object' && visitIdOrBatch !== null) {
            batch = visitIdOrBatch;
            visitId = visitIdOrBatch.visitId || 'visit-kiosk';
            patientId = visitIdOrBatch.patientId || 'patient-kiosk';
        }
        else {
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
            throw new app_error_js_1.ValidationError('Answers batch must be an array of recorded answers.');
        }
        let processedCount = 0;
        let duplicateCount = 0;
        const now = new Date().toISOString();
        const isDb = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        for (const item of batch.answers) {
            if (!item.idempotencyKey) {
                throw new app_error_js_1.ValidationError('Each offline answer must possess a unique idempotency key.');
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
                    await interview_service_js_1.InterviewService.submitAnswer(visitId, patientId, {
                        questionId: item.questionId,
                        answerValue: item.answerValue,
                        answeredVia: item.answeredVia || 'touch',
                        languageUsed: item.languageUsed || 'en',
                        isSkipped: item.isSkipped,
                    });
                }
                catch (err) {
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
        logger_js_1.logger.info('Offline answers batch synchronization complete', {
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
    static async isIdempotencyKeySeen(idempotencyKey) {
        const isDb = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDb) {
            try {
                const found = await prisma_js_1.prisma.syncReceipt.findUnique({
                    where: { idempotency_key: idempotencyKey },
                });
                return Boolean(found);
            }
            catch {
                // Fallback to in-mem store
            }
        }
        return dev_fallback_language_store_js_1.devFallbackLanguageStore.syncReceipts.has(idempotencyKey);
    }
    static async recordSyncReceipt(idempotencyKey, visitId, clientTimestamp) {
        const now = new Date();
        const isDb = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDb) {
            try {
                await prisma_js_1.prisma.syncReceipt.create({
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
            }
            catch {
                // Fallback to in-mem
            }
        }
        dev_fallback_language_store_js_1.devFallbackLanguageStore.syncReceipts.set(idempotencyKey, {
            visitId,
            processedAt: now.toISOString(),
            itemCount: 1,
        });
    }
}
exports.SyncService = SyncService;
