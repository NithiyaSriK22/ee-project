import { LocalAnswerStore } from './LocalAnswerStore';
import { apiClient } from '../../lib/api-client';

export class SyncManager {
  /**
   * Attempts to sync pending answers for the visit with the server.
   * Safe to call multiple times: Idempotency keys prevent duplication on the backend.
   */
  public static async syncPendingAnswers(visitId: string, templateVersion: string = '1.0.0'): Promise<{ synced: number; remaining: number }> {
    const pending = LocalAnswerStore.getAnswersForVisit(visitId);
    if (pending.length === 0) {
      return { synced: 0, remaining: 0 };
    }

    try {
      const payload = {
        visitId,
        templateVersion,
        clientTimestamp: new Date().toISOString(),
        answers: pending,
      };

      const res = await apiClient.post<{ success: boolean; data: { processedCount: number; duplicateCount: number } }>(
        '/kiosk/sync/answers',
        payload
      );

      if (res.data?.success) {
        // Clear local queue upon confirmed sync receipt
        LocalAnswerStore.clearSessionData(visitId);
        return { synced: pending.length, remaining: 0 };
      }
    } catch {
      // Still offline or sync conflict; keep in local store for next retry
    }

    return { synced: 0, remaining: pending.length };
  }
}
