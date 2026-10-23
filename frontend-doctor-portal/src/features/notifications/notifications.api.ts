import { apiClient } from '../../lib/api-client';
import { ApiResponse } from '../../types/api.types';
import { OperationalNotification, NotificationPreference, NotificationType } from './types';

export const notificationsApi = {
  async getNotifications(options?: { unreadOnly?: boolean; type?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', String(options.limit));

    const res = await apiClient.get<ApiResponse<OperationalNotification[]>>(`/notifications?${params.toString()}`);
    return res.data.data || [];
  },

  async getUnreadCount() {
    const res = await apiClient.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    return res.data.data?.unreadCount || 0;
  },

  async markAsRead(notificationId: string) {
    const res = await apiClient.patch<ApiResponse<OperationalNotification>>(`/notifications/${notificationId}/read`);
    return res.data.data;
  },

  async markAllAsRead() {
    const res = await apiClient.patch<ApiResponse<{ markedRead: number }>>('/notifications/read-all');
    return res.data.data;
  },

  async getPreferences() {
    const res = await apiClient.get<ApiResponse<NotificationPreference[]>>('/notification-preferences');
    return res.data.data || [];
  },

  async updatePreference(notificationType: NotificationType, updates: { inAppEnabled?: boolean; smsEnabled?: boolean; kioskScreenEnabled?: boolean }) {
    const res = await apiClient.patch<ApiResponse<NotificationPreference>>('/notification-preferences', {
      notificationType,
      ...updates,
    });
    return res.data.data;
  },
};
