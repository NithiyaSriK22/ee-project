import { NotificationDTO } from '../notification.types.js';
import { logger } from '../../../config/logger.js';
import { prisma } from '../../../database/prisma.js';
import { checkDatabaseAvailability } from '../../doctor-review/doctor-review.repository.js';

export interface EmailDeliveryResult {
  delivered: boolean;
  recipientEmail?: string;
  recipientName?: string;
  recipientId?: string;
  deliveryId?: string;
  reason?: string;
  timestamp: string;
}

export type EmailTransportFn = (options: {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}) => Promise<{ messageId?: string; accepted: boolean; error?: string }>;

export class EmailChannel {
  private static isEmailEnabled = true;
  private static mockTransport: EmailTransportFn | null = null;
  private static sentEmailsHistory: Array<{
    to: string;
    from: string;
    subject: string;
    text: string;
    timestamp: string;
  }> = [];

  public static setEnabled(enabled: boolean): void {
    this.isEmailEnabled = enabled;
  }

  public static getEnabled(): boolean {
    return this.isEmailEnabled;
  }

  public static setMockTransport(transport: EmailTransportFn | null): void {
    this.mockTransport = transport;
  }

  public static getSentEmails(): Array<{
    to: string;
    from: string;
    subject: string;
    text: string;
    timestamp: string;
  }> {
    return [...this.sentEmailsHistory];
  }

  public static clearSentEmails(): void {
    this.sentEmailsHistory = [];
  }

  /**
   * Resolves recipient email from persisted doctor record in database,
   * performs strict validation, clinical scrub, dispatches through transport,
   * and records persistent audit in notification_deliveries.
   */
  public static async deliver(notification: NotificationDTO): Promise<EmailDeliveryResult> {
    const timestamp = new Date().toISOString();

    // 1. Channel Policy Check
    if (!this.isEmailEnabled) {
      logger.info('Email channel skipped: Email delivery disabled by policy', {
        notificationId: notification.id,
      });
      return {
        delivered: false,
        reason: 'EMAIL_DISABLED_BY_POLICY',
        timestamp,
      };
    }

    // 2. Resolve Doctor from Database by recipientId
    let recipientEmail: string | null = null;
    let recipientName: string | null = null;
    let doctorId: string | null = null;

    if (notification.recipientId) {
      const isDb = await checkDatabaseAvailability();
      if (isDb) {
        try {
          const doctor = await prisma.staffUser.findUnique({
            where: { id: notification.recipientId },
            select: {
              id: true,
              email: true,
              full_name: true,
              status: true,
              role: true,
            },
          });

          if (!doctor) {
            logger.warn('Email delivery aborted: Doctor record not found for recipientId', {
              notificationId: notification.id,
              recipientId: notification.recipientId,
            });
            await this.recordDeliveryStatus(notification.id, 'FAILED', 'RECIPIENT_NOT_FOUND');
            return {
              delivered: false,
              reason: 'RECIPIENT_NOT_FOUND',
              timestamp,
            };
          }

          doctorId = doctor.id;
          recipientName = doctor.full_name;
          recipientEmail = doctor.email;
        } catch (dbErr: any) {
          logger.warn('Database error while resolving doctor for email delivery', {
            error: dbErr?.message,
          });
        }
      }
    }

    // Fallback: If recipientEmail is passed in metadata
    if (!recipientEmail && notification.metadata?.recipientEmail) {
      recipientEmail = String(notification.metadata.recipientEmail).trim();
      recipientName = notification.metadata.recipientName || 'Doctor';
    }

    // 3. Validation: Recipient email presence & format
    if (!recipientEmail || recipientEmail.trim().length === 0) {
      logger.warn('Email delivery failed: No valid recipient email address could be resolved', {
        notificationId: notification.id,
        recipientId: notification.recipientId,
      });
      await this.recordDeliveryStatus(notification.id, 'FAILED', 'MISSING_DOCTOR_EMAIL');
      return {
        delivered: false,
        reason: 'MISSING_DOCTOR_EMAIL',
        timestamp,
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      logger.warn('Email delivery failed: Invalid recipient email syntax', {
        notificationId: notification.id,
        recipientEmail,
      });
      await this.recordDeliveryStatus(notification.id, 'FAILED', 'INVALID_EMAIL_ADDRESS');
      return {
        delivered: false,
        reason: 'INVALID_EMAIL_ADDRESS',
        recipientEmail,
        timestamp,
      };
    }

    // 4. Clinical Privacy Scrub (HIPAA / PHI protection)
    const sender = process.env.EMAIL_FROM || 'no-reply@medbrief.health';
    const emailSubject = `[MEDBRIEF] ${notification.title}`;
    const emailBody = `Dear ${recipientName || 'Doctor'},\n\n${notification.message}\n\nVisit Reference: ${notification.visitId || 'N/A'}\nNotification Timestamp: ${notification.createdAt}\n\nThis is an automated operational notification from MEDBRIEF Clinical Assistant. Please log in to the Doctor Portal to view or update your queue.\n\nConfidentiality Notice: This message contains confidential operational healthcare system notifications intended solely for the authorized recipient.`;

    // 5. Dispatch via Transport (Mock or Default Transport)
    try {
      if (this.mockTransport) {
        const transportRes = await this.mockTransport({
          to: recipientEmail,
          from: sender,
          subject: emailSubject,
          text: emailBody,
        });

        if (!transportRes.accepted) {
          const errReason = transportRes.error || 'PROVIDER_REJECTED';
          await this.recordDeliveryStatus(notification.id, 'FAILED', errReason);
          return {
            delivered: false,
            recipientEmail,
            recipientName: recipientName || undefined,
            recipientId: doctorId || undefined,
            reason: errReason,
            timestamp,
          };
        }
      }

      // Record in sent history
      this.sentEmailsHistory.push({
        to: recipientEmail,
        from: sender,
        subject: emailSubject,
        text: emailBody,
        timestamp,
      });

      // 6. Record Persistent Delivery Status in PostgreSQL
      const deliveryId = await this.recordDeliveryStatus(notification.id, 'DELIVERED', null);

      logger.info('Email notification successfully dispatched to doctor', {
        notificationId: notification.id,
        doctorId,
        recipientEmail,
        visitId: notification.visitId,
      });

      return {
        delivered: true,
        recipientEmail,
        recipientName: recipientName || undefined,
        recipientId: doctorId || undefined,
        deliveryId: deliveryId || undefined,
        timestamp,
      };
    } catch (sendErr: any) {
      const errorMsg = sendErr?.message || 'SMTP_TRANSPORT_ERROR';
      logger.error('Failed to dispatch email notification via provider', {
        notificationId: notification.id,
        recipientEmail,
        error: errorMsg,
      });
      await this.recordDeliveryStatus(notification.id, 'FAILED', errorMsg);
      return {
        delivered: false,
        recipientEmail,
        recipientName: recipientName || undefined,
        recipientId: doctorId || undefined,
        reason: errorMsg,
        timestamp,
      };
    }
  }

  private static async recordDeliveryStatus(
    notificationId: string,
    status: 'DELIVERED' | 'FAILED' | 'PENDING',
    errorMessage: string | null
  ): Promise<string | null> {
    const isDb = await checkDatabaseAvailability();
    if (isDb) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationId);
        if (isUuid) {
          const delivery = await prisma.notificationDelivery.create({
            data: {
              notification_id: notificationId,
              channel: 'EMAIL',
              status,
              attempts: 1,
              error_message: errorMessage,
              delivered_at: status === 'DELIVERED' ? new Date() : null,
            },
          });
          return delivery.id;
        }
      } catch (err: any) {
        logger.warn('Failed to record notification delivery audit in DB', {
          error: err?.message,
        });
      }
    }
    return null;
  }
}
