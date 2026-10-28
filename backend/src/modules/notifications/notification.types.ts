export const NotificationTypes = {
  SUMMARY_READY: 'SUMMARY_READY',
  SUMMARY_FAILED: 'SUMMARY_FAILED',
  INTERVIEW_ABANDONED: 'INTERVIEW_ABANDONED',
  DOCUMENT_RESCAN_NEEDED: 'DOCUMENT_RESCAN_NEEDED',
  VOICE_ASSIST_SUGGESTED: 'VOICE_ASSIST_SUGGESTED',
  KIOSK_OFFLINE: 'KIOSK_OFFLINE',
  KIOSK_ONLINE: 'KIOSK_ONLINE',
  QUEUE_STATUS_UPDATE: 'QUEUE_STATUS_UPDATE',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  DOCTOR_ASSIGNED: 'DOCTOR_ASSIGNED',
} as const;

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationChannels = {
  IN_APP: 'IN_APP',
  KIOSK_SCREEN: 'KIOSK_SCREEN',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
} as const;

export type NotificationChannel = (typeof NotificationChannels)[keyof typeof NotificationChannels];

export const MandatoryNotificationTypes: NotificationType[] = [
  NotificationTypes.KIOSK_OFFLINE,
  NotificationTypes.SYSTEM_ANNOUNCEMENT,
];

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  recipientId?: string | null;
  recipientRole?: string | null;
  title: string;
  message: string;
  channel: NotificationChannel;
  visitId?: string | null;
  kioskDeviceId?: string | null;
  deduplicationKey: string;
  isRead: boolean;
  readAt?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferenceDTO {
  id: string;
  staffUserId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  isMandatory?: boolean;
}

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  recipientId?: string | null;
  recipientRole?: string | null;
  visitId?: string | null;
  kioskDeviceId?: string | null;
  deduplicationKey?: string;
  metadata?: Record<string, any>;
  expiresInMinutes?: number;
}
