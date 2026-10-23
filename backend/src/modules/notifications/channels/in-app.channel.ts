import { NotificationDTO } from '../notification.types.js';
import { logger } from '../../../config/logger.js';

export class InAppChannel {
  public static async deliver(notification: NotificationDTO): Promise<boolean> {
    logger.info('Notification delivered to IN_APP channel', {
      notificationId: notification.id,
      recipientId: notification.recipientId,
      recipientRole: notification.recipientRole,
      type: notification.type,
    });
    return true;
  }
}
