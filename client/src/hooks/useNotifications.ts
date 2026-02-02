/**
 * useNotifications Hook
 * Custom hook for managing notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { notificationService, Notification } from '../services';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await notificationService.getUnread();
      setNotifications(data.notifications);
      setUnreadCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev =>
      prev.map(n => (n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    await notificationService.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n._id === id);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  }, [notifications]);

  const clearAll = useCallback(async () => {
    await notificationService.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllRead,
    deleteNotification,
    clearAll,
  };
}

export default useNotifications;
