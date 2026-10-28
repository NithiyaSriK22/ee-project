import { prisma } from '../../database/prisma.js';
import { devFallbackNotificationsStore } from './dev-fallback-notifications-store.js';
import { checkDatabaseAvailability } from '../doctor-review/doctor-review.repository.js';
import {
  NotificationDTO,
  NotificationPreferenceDTO,
  CreateNotificationParams,
  NotificationChannels,
  NotificationTypes,
  MandatoryNotificationTypes,
} from './notification.types.js';
import { InAppChannel } from './channels/in-app.channel.js';
import { KioskScreenChannel } from './channels/kiosk-screen.channel.js';
import { SmsChannel } from './channels/sms.channel.js';
import { EmailChannel } from './channels/email.channel.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';
import { ValidationError, NotFoundError, ForbiddenError } from '../../errors/app-error.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id?: string | null): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export class NotificationService {
  private static inflightRequests = new Map<string, Promise<NotificationDTO>>();

  /**
   * Creates an operational notification with deduplication, clinical sanitization,
   * preference checking, and idempotent channel dispatch.
   */
  public static async createNotification(params: CreateNotificationParams): Promise<NotificationDTO> {
    const channel = params.channel || NotificationChannels.IN_APP;

    // 1. NON-CLINICAL CONTENT ENFORCEMENT
    this.assertNonClinical(params.title, params.message);

    // 2. DEDUPLICATION KEY GENERATION
    const deduplicationKey =
      params.deduplicationKey ||
      `${params.visitId || params.kioskDeviceId || 'sys'}:${params.type}:${channel}:${params.recipientId || 'all'}`;

    // 3. CHECK PREFERENCE (Unless mandatory)
    if (params.recipientId && !MandatoryNotificationTypes.includes(params.type)) {
      const isEnabled = await this.isChannelEnabledForUser(params.recipientId, params.type, channel);
      if (!isEnabled) {
        logger.info('Notification suppressed due to recipient opt-out preference', {
          recipientId: params.recipientId,
          type: params.type,
          channel,
        });
        // Return synthetic suppressed DTO
        return {
          id: 'SKIPPED_PREFERENCE',
          type: params.type,
          recipientId: params.recipientId,
          recipientRole: params.recipientRole,
          title: params.title,
          message: params.message,
          channel,
          visitId: params.visitId,
          kioskDeviceId: params.kioskDeviceId,
          deduplicationKey,
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // Deduplicate concurrent inflight requests for the exact same event
    const inflightKey = `${deduplicationKey}:${params.recipientId || 'broadcast'}`;
    const existingInflight = this.inflightRequests.get(inflightKey);
    if (existingInflight) {
      return await existingInflight;
    }

    const creationPromise = this.executeCreateNotification(params, channel, deduplicationKey);
    this.inflightRequests.set(inflightKey, creationPromise);

    try {
      return await creationPromise;
    } finally {
      this.inflightRequests.delete(inflightKey);
    }
  }

  private static async executeCreateNotification(
    params: CreateNotificationParams,
    channel: any,
    deduplicationKey: string
  ): Promise<NotificationDTO> {
    // 4. CHECK DEDUPLICATION IN STORE / DB
    const existing = await this.findByDeduplicationKey(deduplicationKey, params.recipientId);
    if (existing) {
      logger.info('Duplicate notification suppressed via deduplicationKey', {
        deduplicationKey,
        type: params.type,
      });
      return existing;
    }

    // 5. PERSIST NOTIFICATION
    const now = new Date();
    const expiresAt = params.expiresInMinutes
      ? new Date(now.getTime() + params.expiresInMinutes * 60000).toISOString()
      : null;

    const notificationId = crypto.randomUUID();
    const safeRecipientId = isUuid(params.recipientId) ? params.recipientId : null;
    const metadata: any = { ...(params.metadata || {}) };
    if (params.recipientId && !isUuid(params.recipientId)) {
      metadata.rawRecipientId = params.recipientId;
    }

    const notification: NotificationDTO = {
      id: notificationId,
      type: params.type,
      recipientId: params.recipientId || null,
      recipientRole: params.recipientRole || null,
      title: params.title,
      message: params.message,
      channel,
      visitId: params.visitId || null,
      kioskDeviceId: params.kioskDeviceId || null,
      deduplicationKey,
      isRead: false,
      readAt: null,
      expiresAt,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const isDb = await checkDatabaseAvailability();
    let isDuplicate = false;

    if (isDb) {
      try {
        const saved = await prisma.$transaction(async (tx) => {
          // Transaction-level advisory lock on deduplicationKey to serialize concurrent attempts
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${deduplicationKey}))`;

          const whereClause: any = { deduplication_key: deduplicationKey };
          if (safeRecipientId) {
            whereClause.OR = [
              { recipient_id: safeRecipientId },
              { recipient_id: null },
            ];
          } else {
            whereClause.recipient_id = null;
          }

          const existingRow = await tx.notification.findFirst({
            where: whereClause,
            orderBy: { created_at: 'desc' },
          });

          if (existingRow) {
            isDuplicate = true;
            return {
              id: existingRow.id,
              type: existingRow.type as any,
              recipientId: (existingRow.metadata as any)?.rawRecipientId || existingRow.recipient_id,
              recipientRole: existingRow.recipient_role,
              title: existingRow.title,
              message: existingRow.message,
              channel: existingRow.channel as any,
              visitId: existingRow.visit_id,
              kioskDeviceId: existingRow.kiosk_device_id,
              deduplicationKey: existingRow.deduplication_key,
              isRead: existingRow.is_read,
              readAt: existingRow.read_at?.toISOString() || null,
              expiresAt: existingRow.expires_at?.toISOString() || null,
              metadata: existingRow.metadata as any,
              createdAt: existingRow.created_at.toISOString(),
              updatedAt: existingRow.updated_at.toISOString(),
            };
          }

          const created = await tx.notification.create({
            data: {
              id: notificationId,
              type: notification.type,
              recipient_id: safeRecipientId || undefined,
              recipient_role: notification.recipientRole || undefined,
              title: notification.title,
              message: notification.message,
              channel: notification.channel,
              visit_id: notification.visitId || undefined,
              kiosk_device_id: notification.kioskDeviceId || undefined,
              deduplication_key: notification.deduplicationKey,
              is_read: false,
              expires_at: expiresAt ? new Date(expiresAt) : undefined,
              metadata: notification.metadata as any,
            },
          });

          return {
            ...notification,
            id: created.id,
          };
        });

        notification.id = saved.id;
        if (isDuplicate) {
          logger.info('Duplicate notification suppressed via DB lock check', {
            deduplicationKey,
            type: params.type,
          });
          devFallbackNotificationsStore.notifications.set(saved.id, saved);
          return saved;
        }
      } catch (err: any) {
        if (err?.code === 'P2002' || String(err).includes('unique')) {
          const found = await this.findByDeduplicationKey(deduplicationKey, params.recipientId);
          if (found) return found;
        }
        logger.warn('Error saving notification in DB, saving to in-mem store', { error: String(err) });
        devFallbackNotificationsStore.notifications.set(notificationId, notification);
      }
    } else {
      devFallbackNotificationsStore.notifications.set(notificationId, notification);
    }

    devFallbackNotificationsStore.notifications.set(notification.id, notification);

    // 6. DISPATCH TO CHANNEL
    if (channel === NotificationChannels.IN_APP) {
      await InAppChannel.deliver(notification);
    } else if (channel === NotificationChannels.KIOSK_SCREEN) {
      await KioskScreenChannel.deliver(notification);
    } else if (channel === NotificationChannels.SMS) {
      await SmsChannel.deliver(notification);
    } else if (channel === NotificationChannels.EMAIL) {
      await EmailChannel.deliver(notification);
    }

    return notification;
  }

  /**
   * Lists notifications scoped to recipient user ID or role.
   */
  public static async listNotifications(params: {
    recipientId?: string;
    recipientRole?: string;
    isRead?: boolean;
    limit?: number;
  }): Promise<NotificationDTO[]> {
    const isDb = await checkDatabaseAvailability();
    if (isDb) {
      try {
        const where: any = {};
        if (params.recipientId) {
          if (isUuid(params.recipientId)) {
            where.OR = [
              { recipient_id: params.recipientId },
              { recipient_id: null, recipient_role: params.recipientRole },
              { recipient_id: null, recipient_role: null }, // Broadcasts
            ];
          } else {
            where.OR = [
              { recipient_id: null, recipient_role: params.recipientRole },
              { recipient_id: null, recipient_role: null }, // Broadcasts
            ];
          }
        }
        if (params.isRead !== undefined) {
          where.is_read = params.isRead;
        }

        const rows = await prisma.notification.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: params.limit || 50,
        });

        return rows.map((r) => ({
          id: r.id,
          type: r.type as any,
          recipientId: (r.metadata as any)?.rawRecipientId || r.recipient_id,
          recipientRole: r.recipient_role,
          title: r.title,
          message: r.message,
          channel: r.channel as any,
          visitId: r.visit_id,
          kioskDeviceId: r.kiosk_device_id,
          deduplicationKey: r.deduplication_key,
          isRead: r.is_read,
          readAt: r.read_at?.toISOString() || null,
          expiresAt: r.expires_at?.toISOString() || null,
          metadata: r.metadata as any,
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }));
      } catch (err) {
        logger.warn('Error querying notifications from DB, falling back to in-mem store', { error: String(err) });
      }
    }

    // In-memory fallback
    const all = Array.from(devFallbackNotificationsStore.notifications.values());
    return all
      .filter((n) => {
        if (params.recipientId && n.recipientId && n.recipientId !== params.recipientId) return false;
        if (params.recipientRole && n.recipientRole && n.recipientRole !== params.recipientRole) return false;
        if (params.isRead !== undefined && n.isRead !== params.isRead) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, params.limit || 50);
  }

  public static async getUnreadCount(recipientId?: string, recipientRole?: string): Promise<number> {
    const list = await this.listNotifications({ recipientId, recipientRole, isRead: false });
    return list.length;
  }

  public static async markAsRead(notificationId: string, recipientId?: string): Promise<NotificationDTO> {
    const isDb = await checkDatabaseAvailability();
    const now = new Date();

    if (isDb) {
      try {
        const updated = await prisma.notification.update({
          where: { id: notificationId },
          data: { is_read: true, read_at: now },
        });
        return {
          id: updated.id,
          type: updated.type as any,
          recipientId: (updated.metadata as any)?.rawRecipientId || updated.recipient_id,
          recipientRole: updated.recipient_role,
          title: updated.title,
          message: updated.message,
          channel: updated.channel as any,
          visitId: updated.visit_id,
          kioskDeviceId: updated.kiosk_device_id,
          deduplicationKey: updated.deduplication_key,
          isRead: updated.is_read,
          readAt: updated.read_at?.toISOString() || null,
          createdAt: updated.created_at.toISOString(),
          updatedAt: updated.updated_at.toISOString(),
        };
      } catch {
        // Fallback to in-mem
      }
    }

    const item = devFallbackNotificationsStore.notifications.get(notificationId);
    if (!item) {
      throw new NotFoundError('Notification not found');
    }
    if (recipientId && item.recipientId && item.recipientId !== recipientId) {
      throw new ForbiddenError('Cannot mark another user notification as read');
    }

    item.isRead = true;
    item.readAt = now.toISOString();
    item.updatedAt = now.toISOString();
    devFallbackNotificationsStore.notifications.set(notificationId, item);
    return item;
  }

  public static async markAllAsRead(recipientId: string): Promise<{ markedCount: number }> {
    const list = await this.listNotifications({ recipientId, isRead: false });
    for (const n of list) {
      await this.markAsRead(n.id, recipientId);
    }
    return { markedCount: list.length };
  }

  // ============================================================================
  // PREFERENCES MANAGEMENT
  // ============================================================================

  public static async getPreferences(staffUserId: string): Promise<NotificationPreferenceDTO[]> {
    const allTypes = Object.values(NotificationTypes);
    const channels = [NotificationChannels.IN_APP, NotificationChannels.SMS, NotificationChannels.EMAIL];

    const result: NotificationPreferenceDTO[] = [];

    for (const type of allTypes) {
      for (const channel of channels) {
        const isMandatory = MandatoryNotificationTypes.includes(type as any);
        const key = `${staffUserId}:${type}:${channel}`;
        const stored = devFallbackNotificationsStore.preferences.get(key);

        result.push({
          id: stored ? stored.id : `pref-${staffUserId}-${type}-${channel}`,
          staffUserId,
          notificationType: type as any,
          channel: channel as any,
          enabled: isMandatory ? true : (stored ? stored.enabled : true),
          isMandatory,
        });
      }
    }

    return result;
  }

  public static async updatePreference(
    staffUserId: string,
    notificationType: string,
    channel: string,
    enabled: boolean
  ): Promise<NotificationPreferenceDTO> {
    if (MandatoryNotificationTypes.includes(notificationType as any) && !enabled) {
      throw new ValidationError(
        `Operational Safety Policy: Mandatory system notices (${notificationType}) cannot be disabled.`
      );
    }

    const key = `${staffUserId}:${notificationType}:${channel}`;
    const pref: NotificationPreferenceDTO = {
      id: `pref-${Date.now()}`,
      staffUserId,
      notificationType: notificationType as any,
      channel: channel as any,
      enabled,
      isMandatory: MandatoryNotificationTypes.includes(notificationType as any),
    };

    devFallbackNotificationsStore.preferences.set(key, pref);
    logger.info('Notification preference updated for staff user', {
      staffUserId,
      notificationType,
      channel,
      enabled,
    });

    return pref;
  }

  private static async isChannelEnabledForUser(
    staffUserId: string,
    notificationType: string,
    channel: string
  ): Promise<boolean> {
    const key = `${staffUserId}:${notificationType}:${channel}`;
    const pref = devFallbackNotificationsStore.preferences.get(key);
    return pref ? pref.enabled : true; // Default opt-in
  }

  public static async findByDeduplicationKey(
    deduplicationKey: string,
    recipientId?: string | null
  ): Promise<NotificationDTO | null> {
    // 1. Check in-memory store
    for (const [, n] of devFallbackNotificationsStore.notifications.entries()) {
      if (n.deduplicationKey === deduplicationKey) {
        if (!recipientId || n.recipientId === recipientId || !n.recipientId) {
          return n;
        }
      }
    }

    // 2. Check Database if available
    const isDb = await checkDatabaseAvailability();
    if (isDb) {
      try {
        const safeRecipientId = isUuid(recipientId) ? recipientId : null;
        const whereClause: any = { deduplication_key: deduplicationKey };
        if (safeRecipientId) {
          whereClause.OR = [
            { recipient_id: safeRecipientId },
            { recipient_id: null },
          ];
        } else {
          whereClause.recipient_id = null;
        }

        const row = await prisma.notification.findFirst({
          where: whereClause,
          orderBy: { created_at: 'desc' },
        });

        if (row) {
          const dto: NotificationDTO = {
            id: row.id,
            type: row.type as any,
            recipientId: (row.metadata as any)?.rawRecipientId || row.recipient_id,
            recipientRole: row.recipient_role,
            title: row.title,
            message: row.message,
            channel: row.channel as any,
            visitId: row.visit_id,
            kioskDeviceId: row.kiosk_device_id,
            deduplicationKey: row.deduplication_key,
            isRead: row.is_read,
            readAt: row.read_at?.toISOString() || null,
            expiresAt: row.expires_at?.toISOString() || null,
            metadata: row.metadata as any,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
          };
          devFallbackNotificationsStore.notifications.set(dto.id, dto);
          return dto;
        }
      } catch (err) {
        logger.warn('Error querying notification deduplication from DB', { error: String(err) });
      }
    }

    return null;
  }

  private static assertNonClinical(title: string, message: string): void {
    const combined = `${title} ${message}`.toLowerCase();
    const forbiddenClinicalKeywords = [
      'cancer', 'cardiac arrest', 'chemotherapy', 'heart attack',
      'dyspnea', 'unconscious', 'covid-19', 'diagnosis:', 'prescribed:',
      'chest pain', 'diabetes', 'stroke', 'hypertension', 'bleeding',
      'pain', 'symptom', 'fever',
    ];

    for (const kw of forbiddenClinicalKeywords) {
      if (combined.includes(kw)) {
        throw new ValidationError(
          `Operational Notification Violation: Clinical detail ("${kw}") cannot be included in operational notifications. Clinical safety alerts belong strictly in Module 6.`
        );
      }
    }
  }
}
