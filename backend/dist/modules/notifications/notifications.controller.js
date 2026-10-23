"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const notification_service_js_1 = require("./notification.service.js");
class NotificationsController {
    static async listNotifications(req, res, next) {
        try {
            const recipientId = req.user?.id;
            const recipientRole = req.user?.role;
            const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
            const limit = req.query.limit ? Number(req.query.limit) : 50;
            const notifications = await notification_service_js_1.NotificationService.listNotifications({
                recipientId,
                recipientRole,
                isRead,
                limit,
            });
            res.status(200).json({
                success: true,
                data: notifications,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getUnreadCount(req, res, next) {
        try {
            const recipientId = req.user?.id;
            const recipientRole = req.user?.role;
            const unreadCount = await notification_service_js_1.NotificationService.getUnreadCount(recipientId, recipientRole);
            res.status(200).json({
                success: true,
                data: { unreadCount },
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async markAsRead(req, res, next) {
        try {
            const notificationId = req.params.id || '';
            const recipientId = req.user?.id;
            const updated = await notification_service_js_1.NotificationService.markAsRead(notificationId, recipientId);
            res.status(200).json({
                success: true,
                data: updated,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async markAllAsRead(req, res, next) {
        try {
            const recipientId = req.user?.id || 'staff-default';
            const result = await notification_service_js_1.NotificationService.markAllAsRead(recipientId);
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getPreferences(req, res, next) {
        try {
            const staffUserId = req.user?.id || 'staff-default';
            const preferences = await notification_service_js_1.NotificationService.getPreferences(staffUserId);
            res.status(200).json({
                success: true,
                data: preferences,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async updatePreference(req, res, next) {
        try {
            const staffUserId = req.user?.id || 'staff-default';
            const { notificationType, channel, enabled } = req.body;
            const updated = await notification_service_js_1.NotificationService.updatePreference(staffUserId, notificationType, channel, Boolean(enabled));
            res.status(200).json({
                success: true,
                data: updated,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.NotificationsController = NotificationsController;
