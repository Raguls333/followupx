/**
 * Notification Service
 */

import api from './api';

export interface Notification {
  _id: string;
  userId: string;
  type: 'task_reminder' | 'task_overdue' | 'task_assigned' | 'ai_recovery' | 'lead_assigned' | 'team_activity' | 'deal_won' | 'deal_lost' | 'system' | 'welcome' | 'plan_expiry';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  leadId?: string;
  taskId?: string;
  read: boolean;
  readAt?: string;
  priority: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface UnreadResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    count: number;
  };
}

export const notificationService = {
  /**
   * Get all notifications
   */
  getNotifications: async (
    read?: boolean,
    page = 1,
    limit = 20
  ): Promise<NotificationsResponse['data']> => {
    const params = new URLSearchParams();
    if (read !== undefined) params.append('read', String(read));
    params.append('page', String(page));
    params.append('limit', String(limit));
    const response = await api.get<NotificationsResponse>(`/notifications?${params.toString()}`);
    return response.data;
  },

  /**
   * Get unread notifications
   */
  getUnread: async (limit = 50): Promise<UnreadResponse['data']> => {
    const response = await api.get<UnreadResponse>(`/notifications/unread?limit=${limit}`);
    return response.data;
  },

  /**
   * Get notification count
   */
  getCount: async (): Promise<{ total: number; unread: number }> => {
    const response = await api.get<{ success: boolean; data: { total: number; unread: number } }>(
      '/notifications/count'
    );
    return response.data;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.patch<{ success: boolean; data: { notification: Notification } }>(
      `/notifications/${id}/read`
    );
    return response.data.notification;
  },

  /**
   * Mark all notifications as read
   */
  markAllRead: async (): Promise<number> => {
    const response = await api.patch<{ success: boolean; data: { modified: number } }>(
      '/notifications/mark-all-read'
    );
    return response.data.modified;
  },

  /**
   * Delete notification
   */
  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  /**
   * Clear all notifications
   */
  clearAll: async (): Promise<number> => {
    const response = await api.delete<{ success: boolean; data: { deleted: number } }>(
      '/notifications/clear-all'
    );
    return response.data.deleted;
  },

  /**
   * Get icon for notification type
   */
  getIcon: (type: Notification['type']): string => {
    const icons: Record<Notification['type'], string> = {
      task_reminder: 'bell',
      task_overdue: 'alert-circle',
      task_assigned: 'user-plus',
      ai_recovery: 'cpu',
      lead_assigned: 'user-check',
      team_activity: 'users',
      deal_won: 'trophy',
      deal_lost: 'x-circle',
      system: 'info',
      welcome: 'smile',
      plan_expiry: 'clock',
    };
    return icons[type] || 'bell';
  },
};

export default notificationService;
