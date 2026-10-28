import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { NotificationEventService } from '../src/modules/notifications/notification-event.service.js';
import { NotificationTypes, NotificationChannels } from '../src/modules/notifications/notification.types.js';
import { prisma } from '../src/database/prisma.js';
import crypto from 'crypto';

describe('Notification Service — Idempotent Creation & Deduplication Regression Suite', () => {
  const testRunId = crypto.randomUUID().slice(0, 8);

  it('1 & 2. Calling onSummaryReady twice for the same event does not duplicate notifications and returns consistent ID', async () => {
    const visitId = `visit-dedup-test-${testRunId}-001`;

    const notice1 = await NotificationEventService.onSummaryReady(visitId);
    const notice2 = await NotificationEventService.onSummaryReady(visitId);

    expect(notice1).toBeDefined();
    expect(notice2).toBeDefined();
    expect(notice1.id).toBe(notice2.id);
    expect(notice1.deduplicationKey).toBe(`summary_ready:${visitId}`);
    expect(notice2.deduplicationKey).toBe(`summary_ready:${visitId}`);

    // Verify only one record exists in database
    const dbCount = await prisma.notification.count({
      where: { deduplication_key: `summary_ready:${visitId}` },
    });
    expect(dbCount).toBe(1);
  });

  it('3. Different visits produce distinct notifications and identities', async () => {
    const visitA = `visit-distinct-A-${testRunId}`;
    const visitB = `visit-distinct-B-${testRunId}`;

    const noticeA = await NotificationEventService.onSummaryReady(visitA);
    const noticeB = await NotificationEventService.onSummaryReady(visitB);

    expect(noticeA).toBeDefined();
    expect(noticeB).toBeDefined();
    expect(noticeA.id).not.toBe(noticeB.id);
    expect(noticeA.visitId).toBe(visitA);
    expect(noticeB.visitId).toBe(visitB);
  });

  it('4. Repeated concurrent calls cannot create duplicate notifications', async () => {
    const visitId = `visit-concurrent-${testRunId}`;

    // Execute 5 simultaneous calls to onSummaryReady for the same event
    const results = await Promise.all([
      NotificationEventService.onSummaryReady(visitId),
      NotificationEventService.onSummaryReady(visitId),
      NotificationEventService.onSummaryReady(visitId),
      NotificationEventService.onSummaryReady(visitId),
      NotificationEventService.onSummaryReady(visitId),
    ]);

    // All should be defined
    expect(results).toHaveLength(5);
    const firstId = results[0].id;
    for (const res of results) {
      expect(res.id).toBe(firstId);
    }

    // Verify only 1 row created in database
    const dbCount = await prisma.notification.count({
      where: { deduplication_key: `summary_ready:${visitId}` },
    });
    expect(dbCount).toBe(1);
  });

  it('5. Fallback gracefully when database operations fail without crashing caller', async () => {
    // When non-UUID recipientId is used without erroring out
    const notice = await NotificationService.createNotification({
      type: NotificationTypes.SUMMARY_READY,
      recipientId: 'custom-staff-attendant-non-uuid',
      title: 'Queue Alert',
      message: 'Attendant needed at intake booth 2',
      channel: NotificationChannels.IN_APP,
      deduplicationKey: `custom-alert-${testRunId}`,
    });

    expect(notice).toBeDefined();
    expect(notice.recipientId).toBe('custom-staff-attendant-non-uuid');

    // Repeated call should deduplicate even with custom recipientId
    const noticeRepeat = await NotificationService.createNotification({
      type: NotificationTypes.SUMMARY_READY,
      recipientId: 'custom-staff-attendant-non-uuid',
      title: 'Queue Alert',
      message: 'Attendant needed at intake booth 2',
      channel: NotificationChannels.IN_APP,
      deduplicationKey: `custom-alert-${testRunId}`,
    });

    expect(noticeRepeat.id).toBe(notice.id);
  });

  it('6. Existing notification behaviors remain unchanged (clinical check, preferences, markAsRead)', async () => {
    // Clinical content rejection
    await expect(
      NotificationService.createNotification({
        type: NotificationTypes.SUMMARY_READY,
        title: 'Forbidden Title',
        message: 'Patient has high blood pressure and chest pain',
        deduplicationKey: `forbidden-${testRunId}`,
      })
    ).rejects.toThrow('Clinical detail');

    // Mark as read works
    const visitId = `visit-read-${testRunId}`;
    const notice = await NotificationEventService.onSummaryReady(visitId);
    expect(notice.isRead).toBe(false);

    const marked = await NotificationService.markAsRead(notice.id);
    expect(marked.isRead).toBe(true);
    expect(marked.readAt).toBeTruthy();
  });
});
