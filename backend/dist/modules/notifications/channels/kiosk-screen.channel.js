"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KioskScreenChannel = void 0;
const logger_js_1 = require("../../../config/logger.js");
class KioskScreenChannel {
    static async deliver(notification) {
        logger_js_1.logger.info('Notification dispatched to KIOSK_SCREEN channel', {
            notificationId: notification.id,
            kioskDeviceId: notification.kioskDeviceId,
            visitId: notification.visitId,
            type: notification.type,
        });
        return true;
    }
}
exports.KioskScreenChannel = KioskScreenChannel;
