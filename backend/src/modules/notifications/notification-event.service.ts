import { NotificationService } from './notification.service.js';
import { NotificationTypes, NotificationChannels } from './notification.types.js';
import { logger } from '../../config/logger.js';

export class NotificationEventService {
  /**
   * Dispatched when clinical summary generation completes successfully and enters doctor review queue.
   */
  public static async onSummaryReady(visitId: string, doctorId?: string): Promise<any> {
    try {
      return await NotificationService.createNotification({
        type: NotificationTypes.SUMMARY_READY,
        recipientId: doctorId || null,
        recipientRole: 'DOCTOR',
        visitId,
        title: 'New Patient Summary Ready for Review',
        message: `Intake summary for visit ${visitId} is prepared and awaiting physician confirmation.`,
        channel: NotificationChannels.IN_APP,
        deduplicationKey: `summary_ready:${visitId}`,
      });
    } catch (err) {
      logger.warn('Failed to emit onSummaryReady operational notification', { visitId, error: String(err) });
      return undefined;
    }
  }

  /**
   * Dispatched when clinical summary generation fails and doctor must view raw answers.
   */
  public static async onSummaryFailed(visitId: string): Promise<void> {
    try {
      await NotificationService.createNotification({
        type: NotificationTypes.SUMMARY_FAILED,
        recipientRole: 'DOCTOR',
        visitId,
        title: 'Summary Unavailable — Use Raw View',
        message: `Automated summary could not be produced for visit ${visitId}. Direct structured intake view is available.`,
        channel: NotificationChannels.IN_APP,
        deduplicationKey: `summary_failed:${visitId}`,
      });
    } catch (err) {
      logger.warn('Failed to emit onSummaryFailed operational notification', { visitId, error: String(err) });
    }
  }

  /**
   * Dispatched when an interview session times out or is abandoned by a patient mid-intake.
   */
  public static async onInterviewAbandoned(visitId: string, kioskDeviceId?: string): Promise<void> {
    try {
      await NotificationService.createNotification({
        type: NotificationTypes.INTERVIEW_ABANDONED,
        recipientRole: 'STAFF_ATTENDANT',
        visitId,
        kioskDeviceId,
        title: 'Kiosk Session Abandoned Mid-Interview',
        message: `Patient at kiosk ${kioskDeviceId || 'station'} departed before completing intake. Session data cleared from terminal.`,
        channel: NotificationChannels.IN_APP,
        deduplicationKey: `interview_abandoned:${visitId}`,
      });
    } catch (err) {
      logger.warn('Failed to emit onInterviewAbandoned operational notification', { visitId, error: String(err) });
    }
  }

  /**
   * Dispatched when an uploaded prescription or old record is unreadable or failed validation.
   */
  public static async onDocumentRescanNeeded(visitId: string, documentId: string): Promise<void> {
    try {
      await NotificationService.createNotification({
        type: NotificationTypes.DOCUMENT_RESCAN_NEEDED,
        recipientRole: 'STAFF_ATTENDANT',
        visitId,
        title: 'Document Rescan Needed',
        message: `Prescription scan ${documentId.substring(0, 8)} could not be validated. Please assist patient with rescan.`,
        channel: NotificationChannels.IN_APP,
        deduplicationKey: `rescan_needed:${documentId}`,
      });
    } catch (err) {
      logger.warn('Failed to emit onDocumentRescanNeeded operational notification', { visitId, error: String(err) });
    }
  }

  /**
   * Dispatched when repeated voice transcription failures occur at a kiosk (e.g. noisy hall).
   */
  public static async onVoiceAssistSuggested(visitId: string, kioskDeviceId?: string): Promise<void> {
    try {
      await NotificationService.createNotification({
        type: NotificationTypes.VOICE_ASSIST_SUGGESTED,
        recipientRole: 'STAFF_ATTENDANT',
        visitId,
        kioskDeviceId,
        title: 'Kiosk Voice Assistance Suggested',
        message: `Repeated voice recognition retries detected at ${kioskDeviceId || 'kiosk'}. Staff assistance may be beneficial.`,
        channel: NotificationChannels.IN_APP,
        deduplicationKey: `voice_assist:${visitId}:${kioskDeviceId}`,
      });
    } catch (err) {
      logger.warn('Failed to emit onVoiceAssistSuggested operational notification', { visitId, error: String(err) });
    }
  }

  /**
   * Dispatched on kiosk device offline or online heartbeat transitions.
   */
  public static async onKioskHeartbeat(deviceCode: string, isOnline: boolean): Promise<void> {
    const type = isOnline ? NotificationTypes.KIOSK_ONLINE : NotificationTypes.KIOSK_OFFLINE;
    const title = isOnline ? `Kiosk Device ${deviceCode} Online` : `Kiosk Device ${deviceCode} Offline`;
    const message = isOnline
      ? `Kiosk station ${deviceCode} reconnected to hospital network.`
      : `Kiosk station ${deviceCode} missed heartbeat pings and may be disconnected.`;

    try {
      await NotificationService.createNotification({
        type,
        recipientRole: 'ADMIN',
        kioskDeviceId: deviceCode,
        title,
        message,
        channel: NotificationChannels.IN_APP,
        deduplicationKey: `kiosk_heartbeat:${deviceCode}:${type}`,
      });
    } catch (err) {
      logger.warn('Failed to emit kiosk heartbeat notification', { deviceCode, error: String(err) });
    }
  }
}
