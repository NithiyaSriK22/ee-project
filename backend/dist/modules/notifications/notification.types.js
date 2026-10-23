"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MandatoryNotificationTypes = exports.NotificationChannels = exports.NotificationTypes = void 0;
exports.NotificationTypes = {
    SUMMARY_READY: 'SUMMARY_READY',
    SUMMARY_FAILED: 'SUMMARY_FAILED',
    INTERVIEW_ABANDONED: 'INTERVIEW_ABANDONED',
    DOCUMENT_RESCAN_NEEDED: 'DOCUMENT_RESCAN_NEEDED',
    VOICE_ASSIST_SUGGESTED: 'VOICE_ASSIST_SUGGESTED',
    KIOSK_OFFLINE: 'KIOSK_OFFLINE',
    KIOSK_ONLINE: 'KIOSK_ONLINE',
    QUEUE_STATUS_UPDATE: 'QUEUE_STATUS_UPDATE',
    SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
};
exports.NotificationChannels = {
    IN_APP: 'IN_APP',
    KIOSK_SCREEN: 'KIOSK_SCREEN',
    SMS: 'SMS',
};
exports.MandatoryNotificationTypes = [
    exports.NotificationTypes.KIOSK_OFFLINE,
    exports.NotificationTypes.SYSTEM_ANNOUNCEMENT,
];
