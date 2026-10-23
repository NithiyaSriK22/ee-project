import { NotificationDTO, NotificationPreferenceDTO } from './notification.types.js';

export class DevFallbackNotificationsStore {
  private static instance: DevFallbackNotificationsStore;

  public notifications: Map<string, NotificationDTO> = new Map();
  public preferences: Map<string, NotificationPreferenceDTO> = new Map(); // key: `${userId}:${type}:${channel}`
  public deliveryLogs: Array<{ notificationId: string; channel: string; status: string; attempts: number; timestamp: string }> = [];

  private constructor() {}

  public static getInstance(): DevFallbackNotificationsStore {
    if (!DevFallbackNotificationsStore.instance) {
      DevFallbackNotificationsStore.instance = new DevFallbackNotificationsStore();
    }
    return DevFallbackNotificationsStore.instance;
  }

  public clearAll(): void {
    this.notifications.clear();
    this.preferences.clear();
    this.deliveryLogs = [];
  }
}

export const devFallbackNotificationsStore = DevFallbackNotificationsStore.getInstance();
