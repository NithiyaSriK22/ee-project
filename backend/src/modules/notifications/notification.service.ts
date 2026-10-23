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
import { logger } from '../../config/logger.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../errors/app-error.js';

export class NotificationService {
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

    // 4. CHECK DEDUPLICATION IN STORE
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

    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
      metadata: params.metadata,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const isDb = await checkDatabaseAvailability();
    if (isDb) {
      try {
        const created = await prisma.notification.create({
          data: {
            id: notificationId,
            type: notification.type,
            recipient_id: notification.recipientId || undefined,
            recipient_role: notification.recipientRole || undefined,
            title: notification.title,
            message: notification.message,
            channel: notification.channel,
            visit_id: notification.visitId || undefined,
            kiosk_device_id: notification.kioskDeviceId || undefined,
            deduplication_key: notification.deduplicationKey,
            is_read: false,
            expires_at: expiresAt ? new Date(expiresAt) : undefined,
            metadata: params.metadata ? (params.metadata as any) : undefined,
          },
        });
        notification.id = created.id;
      } catch (err: any) {
        // If unique constraint hit on deduplication_key
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

    // 6. DISPATCH TO CHANNEL
    if (channel === NotificationChannels.IN_APP) {
      await InAppChannel.deliver(notification);
    } else if (channel === NotificationChannels.KIOSK_SCREEN) {
      await KioskScreenChannel.deliver(notification);
    } else if (channel === NotificationChannels.SMS) {
      await SmsChannel.deliver(notification);
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
          where.OR = [
            { recipient_id: params.recipientId },
            { recipient_id: null, recipient_role: params.recipientRole },
            { recipient_id: null, recipient_role: null }, // Broadcasts
          ];
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
          recipientId: r.recipient_id,
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
          recipientId: updated.recipient_id,
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
    const channels = [NotificationChannels.IN_APP, NotificationChannels.SMS];

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

  private static async findByDeduplicationKey(deduplicationKey: string, recipientId?: string | null): Promise<NotificationDTO | null> {
    for (const [, n] of devFallbackNotificationsStore.notifications.entries()) {
      if (n.deduplicationKey === deduplicationKey) {
        if (!recipientId || n.recipientId === recipientId || !n.recipientId) {
          return n;
        }
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
