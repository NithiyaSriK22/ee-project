"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const dev_fallback_notifications_store_js_1 = require("./dev-fallback-notifications-store.js");
const doctor_review_repository_js_1 = require("../doctor-review/doctor-review.repository.js");
const notification_types_js_1 = require("./notification.types.js");
const in_app_channel_js_1 = require("./channels/in-app.channel.js");
const kiosk_screen_channel_js_1 = require("./channels/kiosk-screen.channel.js");
const sms_channel_js_1 = require("./channels/sms.channel.js");
const logger_js_1 = require("../../config/logger.js");
const app_error_js_1 = require("../../errors/app-error.js");
class NotificationService {
    /**
     * Creates an operational notification with deduplication, clinical sanitization,
     * preference checking, and idempotent channel dispatch.
     */
    static async createNotification(params) {
        const channel = params.channel || notification_types_js_1.NotificationChannels.IN_APP;
        // 1. NON-CLINICAL CONTENT ENFORCEMENT
        this.assertNonClinical(params.title, params.message);
        // 2. DEDUPLICATION KEY GENERATION
        const deduplicationKey = params.deduplicationKey ||
            `${params.visitId || params.kioskDeviceId || 'sys'}:${params.type}:${channel}:${params.recipientId || 'all'}`;
        // 3. CHECK PREFERENCE (Unless mandatory)
        if (params.recipientId && !notification_types_js_1.MandatoryNotificationTypes.includes(params.type)) {
            const isEnabled = await this.isChannelEnabledForUser(params.recipientId, params.type, channel);
            if (!isEnabled) {
                logger_js_1.logger.info('Notification suppressed due to recipient opt-out preference', {
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
            logger_js_1.logger.info('Duplicate notification suppressed via deduplicationKey', {
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
        const notification = {
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
        const isDb = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDb) {
            try {
                const created = await prisma_js_1.prisma.notification.create({
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
                        metadata: params.metadata ? params.metadata : undefined,
                    },
                });
                notification.id = created.id;
            }
            catch (err) {
                // If unique constraint hit on deduplication_key
                if (err?.code === 'P2002' || String(err).includes('unique')) {
                    const found = await this.findByDeduplicationKey(deduplicationKey, params.recipientId);
                    if (found)
                        return found;
                }
                logger_js_1.logger.warn('Error saving notification in DB, saving to in-mem store', { error: String(err) });
                dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.notifications.set(notificationId, notification);
            }
        }
        else {
            dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.notifications.set(notificationId, notification);
        }
        // 6. DISPATCH TO CHANNEL
        if (channel === notification_types_js_1.NotificationChannels.IN_APP) {
            await in_app_channel_js_1.InAppChannel.deliver(notification);
        }
        else if (channel === notification_types_js_1.NotificationChannels.KIOSK_SCREEN) {
            await kiosk_screen_channel_js_1.KioskScreenChannel.deliver(notification);
        }
        else if (channel === notification_types_js_1.NotificationChannels.SMS) {
            await sms_channel_js_1.SmsChannel.deliver(notification);
        }
        return notification;
    }
    /**
     * Lists notifications scoped to recipient user ID or role.
     */
    static async listNotifications(params) {
        const isDb = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDb) {
            try {
                const where = {};
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
                const rows = await prisma_js_1.prisma.notification.findMany({
                    where,
                    orderBy: { created_at: 'desc' },
                    take: params.limit || 50,
                });
                return rows.map((r) => ({
                    id: r.id,
                    type: r.type,
                    recipientId: r.recipient_id,
                    recipientRole: r.recipient_role,
                    title: r.title,
                    message: r.message,
                    channel: r.channel,
                    visitId: r.visit_id,
                    kioskDeviceId: r.kiosk_device_id,
                    deduplicationKey: r.deduplication_key,
                    isRead: r.is_read,
                    readAt: r.read_at?.toISOString() || null,
                    expiresAt: r.expires_at?.toISOString() || null,
                    metadata: r.metadata,
                    createdAt: r.created_at.toISOString(),
                    updatedAt: r.updated_at.toISOString(),
                }));
            }
            catch (err) {
                logger_js_1.logger.warn('Error querying notifications from DB, falling back to in-mem store', { error: String(err) });
            }
        }
        // In-memory fallback
        const all = Array.from(dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.notifications.values());
        return all
            .filter((n) => {
            if (params.recipientId && n.recipientId && n.recipientId !== params.recipientId)
                return false;
            if (params.recipientRole && n.recipientRole && n.recipientRole !== params.recipientRole)
                return false;
            if (params.isRead !== undefined && n.isRead !== params.isRead)
                return false;
            return true;
        })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, params.limit || 50);
    }
    static async getUnreadCount(recipientId, recipientRole) {
        const list = await this.listNotifications({ recipientId, recipientRole, isRead: false });
        return list.length;
    }
    static async markAsRead(notificationId, recipientId) {
        const isDb = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        const now = new Date();
        if (isDb) {
            try {
                const updated = await prisma_js_1.prisma.notification.update({
                    where: { id: notificationId },
                    data: { is_read: true, read_at: now },
                });
                return {
                    id: updated.id,
                    type: updated.type,
                    recipientId: updated.recipient_id,
                    recipientRole: updated.recipient_role,
                    title: updated.title,
                    message: updated.message,
                    channel: updated.channel,
                    visitId: updated.visit_id,
                    kioskDeviceId: updated.kiosk_device_id,
                    deduplicationKey: updated.deduplication_key,
                    isRead: updated.is_read,
                    readAt: updated.read_at?.toISOString() || null,
                    createdAt: updated.created_at.toISOString(),
                    updatedAt: updated.updated_at.toISOString(),
                };
            }
            catch {
                // Fallback to in-mem
            }
        }
        const item = dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.notifications.get(notificationId);
        if (!item) {
            throw new app_error_js_1.NotFoundError('Notification not found');
        }
        if (recipientId && item.recipientId && item.recipientId !== recipientId) {
            throw new app_error_js_1.ForbiddenError('Cannot mark another user notification as read');
        }
        item.isRead = true;
        item.readAt = now.toISOString();
        item.updatedAt = now.toISOString();
        dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.notifications.set(notificationId, item);
        return item;
    }
    static async markAllAsRead(recipientId) {
        const list = await this.listNotifications({ recipientId, isRead: false });
        for (const n of list) {
            await this.markAsRead(n.id, recipientId);
        }
        return { markedCount: list.length };
    }
    // ============================================================================
    // PREFERENCES MANAGEMENT
    // ============================================================================
    static async getPreferences(staffUserId) {
        const allTypes = Object.values(notification_types_js_1.NotificationTypes);
        const channels = [notification_types_js_1.NotificationChannels.IN_APP, notification_types_js_1.NotificationChannels.SMS];
        const result = [];
        for (const type of allTypes) {
            for (const channel of channels) {
                const isMandatory = notification_types_js_1.MandatoryNotificationTypes.includes(type);
                const key = `${staffUserId}:${type}:${channel}`;
                const stored = dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.preferences.get(key);
                result.push({
                    id: stored ? stored.id : `pref-${staffUserId}-${type}-${channel}`,
                    staffUserId,
                    notificationType: type,
                    channel: channel,
                    enabled: isMandatory ? true : (stored ? stored.enabled : true),
                    isMandatory,
                });
            }
        }
        return result;
    }
    static async updatePreference(staffUserId, notificationType, channel, enabled) {
        if (notification_types_js_1.MandatoryNotificationTypes.includes(notificationType) && !enabled) {
            throw new app_error_js_1.ValidationError(`Operational Safety Policy: Mandatory system notices (${notificationType}) cannot be disabled.`);
        }
        const key = `${staffUserId}:${notificationType}:${channel}`;
        const pref = {
            id: `pref-${Date.now()}`,
            staffUserId,
            notificationType: notificationType,
            channel: channel,
            enabled,
            isMandatory: notification_types_js_1.MandatoryNotificationTypes.includes(notificationType),
        };
        dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.preferences.set(key, pref);
        logger_js_1.logger.info('Notification preference updated for staff user', {
            staffUserId,
            notificationType,
            channel,
            enabled,
        });
        return pref;
    }
    static async isChannelEnabledForUser(staffUserId, notificationType, channel) {
        const key = `${staffUserId}:${notificationType}:${channel}`;
        const pref = dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.preferences.get(key);
        return pref ? pref.enabled : true; // Default opt-in
    }
    static async findByDeduplicationKey(deduplicationKey, recipientId) {
        for (const [, n] of dev_fallback_notifications_store_js_1.devFallbackNotificationsStore.notifications.entries()) {
            if (n.deduplicationKey === deduplicationKey) {
                if (!recipientId || n.recipientId === recipientId || !n.recipientId) {
                    return n;
                }
            }
        }
        return null;
    }
    static assertNonClinical(title, message) {
        const combined = `${title} ${message}`.toLowerCase();
        const forbiddenClinicalKeywords = [
            'cancer', 'cardiac arrest', 'chemotherapy', 'heart attack',
            'dyspnea', 'unconscious', 'covid-19', 'diagnosis:', 'prescribed:',
            'chest pain', 'diabetes', 'stroke', 'hypertension', 'bleeding',
            'pain', 'symptom', 'fever',
        ];
        for (const kw of forbiddenClinicalKeywords) {
            if (combined.includes(kw)) {
                throw new app_error_js_1.ValidationError(`Operational Notification Violation: Clinical detail ("${kw}") cannot be included in operational notifications. Clinical safety alerts belong strictly in Module 6.`);
            }
        }
    }
}
exports.NotificationService = NotificationService;
