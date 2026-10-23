import { NotificationDTO } from '../notification.types.js';
import { logger } from '../../../config/logger.js';

export class KioskScreenChannel {
  public static async deliver(notification: NotificationDTO): Promise<boolean> {
    logger.info('Notification dispatched to KIOSK_SCREEN channel', {
      notificationId: notification.id,
      kioskDeviceId: notification.kioskDeviceId,
      visitId: notification.visitId,
      type: notification.type,
    });
    return true;
  }
}
