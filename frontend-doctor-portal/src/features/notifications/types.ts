export type NotificationType =
  | 'SUMMARY_READY'
  | 'SUMMARY_FAILED'
  | 'INTERVIEW_ABANDONED'
  | 'DOCUMENT_RESCAN_NEEDED'
  | 'VOICE_ASSIST_SUGGESTED'
  | 'KIOSK_OFFLINE'
  | 'KIOSK_ONLINE'
  | 'QUEUE_STATUS_UPDATE'
  | 'SYSTEM_ANNOUNCEMENT';

export type NotificationChannel = 'IN_APP' | 'KIOSK_SCREEN' | 'SMS';

export interface OperationalNotification {
  id: string;
  recipientId: string;
  recipientRole?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  visitId?: string;
  kioskId?: string;
  metadata?: Record<string, any>;
  deduplicationKey: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  notificationType: NotificationType;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  kioskScreenEnabled: boolean;
}
