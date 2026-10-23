"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KioskFleetService = void 0;
const logger_js_1 = require("../../../config/logger.js");
const dev_fallback_admin_store_js_1 = require("../dev-fallback-admin-store.js");
const notification_service_js_1 = require("../../notifications/notification.service.js");
const notification_types_js_1 = require("../../notifications/notification.types.js");
class KioskFleetService {
    /**
     * Lists all registered kiosk devices with live hardware health and heartbeat currency.
     */
    static async listKioskDevices() {
        return dev_fallback_admin_store_js_1.devFallbackAdminStore.listKiosks();
    }
    /**
     * Retrieves single kiosk device telemetry
     */
    static async getKioskDevice(deviceCode) {
        return dev_fallback_admin_store_js_1.devFallbackAdminStore.getKiosk(deviceCode);
    }
    /**
     * Ingests kiosk device heartbeat and detects offline transitions.
     * If a device transitions to OFFLINE, raises an operational notification via Module 8.
     */
    static async recordHeartbeat(params) {
        const existing = dev_fallback_admin_store_js_1.devFallbackAdminStore.getKiosk(params.deviceCode);
        const prevStatus = existing?.status || 'ONLINE';
        const newStatus = params.status || 'ONLINE';
        const updated = dev_fallback_admin_store_js_1.devFallbackAdminStore.updateKioskHeartbeat(params.deviceCode, {
            ...params,
            status: newStatus,
        });
        // Check for offline transition
        if (prevStatus !== 'OFFLINE' && newStatus === 'OFFLINE') {
            logger_js_1.logger.warn(`[KIOSK_FLEET] Device ${params.deviceCode} transitioned to OFFLINE`);
            // Dispatch non-clinical operational notification to admin & staff
            notification_service_js_1.NotificationService.createNotification({
                type: notification_types_js_1.NotificationTypes.KIOSK_OFFLINE,
                recipientRole: 'ADMIN',
                title: `Kiosk Offline: ${params.deviceCode}`,
                message: `Hardware unit ${params.deviceCode} at ${updated.facilityName} is no longer receiving heartbeats. Please verify network and power.`,
                channel: notification_types_js_1.NotificationChannels.IN_APP,
                kioskDeviceId: params.deviceCode,
            }).catch((notifErr) => {
                logger_js_1.logger.error('Failed to dispatch kiosk offline notification', {
                    error: notifErr instanceof Error ? notifErr.message : String(notifErr),
                });
            });
        }
        return updated;
    }
}
exports.KioskFleetService = KioskFleetService;
