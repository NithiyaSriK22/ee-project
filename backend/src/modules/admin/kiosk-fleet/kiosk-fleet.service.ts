import { logger } from '../../../config/logger.js';
import { KioskDeviceStatus } from '../admin.types.js';
import { devFallbackAdminStore } from '../dev-fallback-admin-store.js';
import { NotificationService } from '../../notifications/notification.service.js';
import { NotificationChannels, NotificationTypes } from '../../notifications/notification.types.js';

export class KioskFleetService {
  /**
   * Lists all registered kiosk devices with live hardware health and heartbeat currency.
   */
  public static async listKioskDevices(): Promise<KioskDeviceStatus[]> {
    return devFallbackAdminStore.listKiosks();
  }

  /**
   * Retrieves single kiosk device telemetry
   */
  public static async getKioskDevice(deviceCode: string): Promise<KioskDeviceStatus | undefined> {
    return devFallbackAdminStore.getKiosk(deviceCode);
  }

  /**
   * Ingests kiosk device heartbeat and detects offline transitions.
   * If a device transitions to OFFLINE, raises an operational notification via Module 8.
   */
  public static async recordHeartbeat(params: {
    deviceCode: string;
    ipAddress?: string;
    softwareVersion?: string;
    cacheVersion?: string;
    cameraStatus?: 'OK' | 'WARN' | 'FAIL';
    microphoneStatus?: 'OK' | 'WARN' | 'FAIL';
    speakerStatus?: 'OK' | 'WARN' | 'FAIL';
    offlineSessionsQueued?: number;
    status?: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  }): Promise<KioskDeviceStatus> {
    const existing = devFallbackAdminStore.getKiosk(params.deviceCode);
    const prevStatus = existing?.status || 'ONLINE';
    const newStatus = params.status || 'ONLINE';

    const updated = devFallbackAdminStore.updateKioskHeartbeat(params.deviceCode, {
      ...params,
      status: newStatus,
    });

    // Check for offline transition
    if (prevStatus !== 'OFFLINE' && newStatus === 'OFFLINE') {
      logger.warn(`[KIOSK_FLEET] Device ${params.deviceCode} transitioned to OFFLINE`);

      // Dispatch non-clinical operational notification to admin & staff
      NotificationService.createNotification({
        type: NotificationTypes.KIOSK_OFFLINE,
        recipientRole: 'ADMIN',
        title: `Kiosk Offline: ${params.deviceCode}`,
        message: `Hardware unit ${params.deviceCode} at ${updated.facilityName} is no longer receiving heartbeats. Please verify network and power.`,
        channel: NotificationChannels.IN_APP,
        kioskDeviceId: params.deviceCode,
      }).catch((notifErr) => {
        logger.error('Failed to dispatch kiosk offline notification', {
          error: notifErr instanceof Error ? notifErr.message : String(notifErr),
        });
      });
    }

    return updated;
  }
}
