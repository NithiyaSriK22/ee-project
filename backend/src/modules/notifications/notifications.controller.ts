import { Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { AppRequest } from '../../types/api.types.js';

export class NotificationsController {
  public static async listNotifications(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recipientId = req.user?.id;
      const recipientRole = req.user?.role;
      const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const notifications = await NotificationService.listNotifications({
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
    } catch (err) {
      next(err);
    }
  }

  public static async getUnreadCount(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recipientId = req.user?.id;
      const recipientRole = req.user?.role;

      const unreadCount = await NotificationService.getUnreadCount(recipientId, recipientRole);
      res.status(200).json({
        success: true,
        data: { unreadCount },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async markAsRead(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notificationId = (req.params.id as string) || '';
      const recipientId = req.user?.id;

      const updated = await NotificationService.markAsRead(notificationId, recipientId);
      res.status(200).json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async markAllAsRead(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recipientId = req.user?.id || 'staff-default';
      const result = await NotificationService.markAllAsRead(recipientId);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPreferences(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const staffUserId = req.user?.id || 'staff-default';
      const preferences = await NotificationService.getPreferences(staffUserId);
      res.status(200).json({
        success: true,
        data: preferences,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePreference(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const staffUserId = req.user?.id || 'staff-default';
      const { notificationType, channel, enabled } = req.body;

      const updated = await NotificationService.updatePreference(
        staffUserId,
        notificationType,
        channel,
        Boolean(enabled)
      );

      res.status(200).json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}
