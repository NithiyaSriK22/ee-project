"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppChannel = void 0;
const logger_js_1 = require("../../../config/logger.js");
class InAppChannel {
    static async deliver(notification) {
        logger_js_1.logger.info('Notification delivered to IN_APP channel', {
            notificationId: notification.id,
            recipientId: notification.recipientId,
            recipientRole: notification.recipientRole,
            type: notification.type,
        });
        return true;
    }
}
exports.InAppChannel = InAppChannel;
