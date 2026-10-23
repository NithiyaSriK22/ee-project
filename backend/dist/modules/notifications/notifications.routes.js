"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationPreferencesRoutes = exports.notificationRoutes = void 0;
const express_1 = require("express");
const notifications_controller_js_1 = require("./notifications.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
exports.notificationRoutes = (0, express_1.Router)();
// Staff notification inbox endpoints
exports.notificationRoutes.get('/', auth_middleware_js_1.authenticateStaff, notifications_controller_js_1.NotificationsController.listNotifications);
exports.notificationRoutes.get('/unread-count', auth_middleware_js_1.authenticateStaff, notifications_controller_js_1.NotificationsController.getUnreadCount);
exports.notificationRoutes.patch('/read-all', auth_middleware_js_1.authenticateStaff, notifications_controller_js_1.NotificationsController.markAllAsRead);
exports.notificationRoutes.patch('/:id/read', auth_middleware_js_1.authenticateStaff, notifications_controller_js_1.NotificationsController.markAsRead);
// Preferences endpoints
exports.notificationRoutes.get('/preferences', auth_middleware_js_1.authenticateStaff, notifications_controller_js_1.NotificationsController.getPreferences);
exports.notificationRoutes.patch('/preferences', auth_middleware_js_1.authenticateStaff, notifications_controller_js_1.NotificationsController.updatePreference);
exports.notificationPreferencesRoutes = (0, express_1.Router)();
exports.notificationPreferencesRoutes.get('/', auth_middleware_js_1.authenticateStaff, notifications_controller_js_1.NotificationsController.getPreferences);
exports.notificationPreferencesRoutes.patch('/', auth_middleware_js_1.authenticateStaff, notifications_controller_js_1.NotificationsController.updatePreference);
