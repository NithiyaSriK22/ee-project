import { Router } from 'express';
import { NotificationsController } from './notifications.controller.js';
import { authenticateStaff } from '../../middleware/auth.middleware.js';

export const notificationRoutes = Router();

// Staff notification inbox endpoints
notificationRoutes.get('/', authenticateStaff, NotificationsController.listNotifications);
notificationRoutes.get('/unread-count', authenticateStaff, NotificationsController.getUnreadCount);
notificationRoutes.patch('/read-all', authenticateStaff, NotificationsController.markAllAsRead);
notificationRoutes.patch('/:id/read', authenticateStaff, NotificationsController.markAsRead);

// Preferences endpoints
notificationRoutes.get('/preferences', authenticateStaff, NotificationsController.getPreferences);
notificationRoutes.patch('/preferences', authenticateStaff, NotificationsController.updatePreference);

export const notificationPreferencesRoutes = Router();
notificationPreferencesRoutes.get('/', authenticateStaff, NotificationsController.getPreferences);
notificationPreferencesRoutes.patch('/', authenticateStaff, NotificationsController.updatePreference);
