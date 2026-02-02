import { useState, useCallback, useEffect } from 'react';
import type { ScheduledMessage, ScheduledMessageStats, ScheduledMessageFilter } from '../services/scheduledMessagesService';
import { scheduledMessagesService } from '../services/scheduledMessagesService';

interface UseScheduledMessagesOptions {
  autoFetchUpcoming?: boolean;
  autoFetchStats?: boolean;
  initialFilter?: ScheduledMessageFilter;
}

export const useScheduledMessages = (options: UseScheduledMessagesOptions = {}) => {
  const { autoFetchUpcoming = false, autoFetchStats = false, initialFilter = {} } = options;

  // State
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [upcomingMessages, setUpcomingMessages] = useState<ScheduledMessage[]>([]);
  const [stats, setStats] = useState<ScheduledMessageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ScheduledMessageFilter>(initialFilter);

  // Fetch scheduled messages
  const fetchMessages = useCallback(async (filterOverride?: ScheduledMessageFilter) => {
    setLoading(true);
    setError(null);
    try {
      const mergedFilter = { ...filter, ...filterOverride };
      const data = await scheduledMessagesService.getScheduledMessages(mergedFilter);
      setMessages(data || []);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch upcoming messages
  const fetchUpcomingMessages = useCallback(async () => {
    setError(null);
    try {
      const data = await scheduledMessagesService.getUpcomingMessages();
      setUpcomingMessages(data || []);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const data = await scheduledMessagesService.getMessageStats();
      setStats(data);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, []);

  // Create scheduled message
  const createMessage = useCallback(async (messageData: Omit<ScheduledMessage, '_id' | 'createdAt' | 'updatedAt'>) => {
    setError(null);
    try {
      const newMessage = await scheduledMessagesService.createScheduledMessage(messageData);
      setMessages((prev) => [newMessage, ...prev]);
      await Promise.all([
        autoFetchStats && fetchStats(),
        autoFetchUpcoming && fetchUpcomingMessages(),
      ]);
      return newMessage;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [autoFetchStats, autoFetchUpcoming, fetchStats, fetchUpcomingMessages]);

  // Update scheduled message
  const updateMessage = useCallback(async (id: string, messageData: Partial<ScheduledMessage>) => {
    setError(null);
    try {
      const updatedMessage = await scheduledMessagesService.updateScheduledMessage(id, messageData);
      setMessages((prev) =>
        prev.map((msg) => (msg._id === id ? updatedMessage : msg))
      );
      await Promise.all([
        autoFetchStats && fetchStats(),
        autoFetchUpcoming && fetchUpcomingMessages(),
      ]);
      return updatedMessage;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [autoFetchStats, autoFetchUpcoming, fetchStats, fetchUpcomingMessages]);

  // Cancel scheduled message
  const cancelMessage = useCallback(async (id: string) => {
    setError(null);
    try {
      const cancelledMessage = await scheduledMessagesService.cancelScheduledMessage(id);
      setMessages((prev) =>
        prev.map((msg) => (msg._id === id ? cancelledMessage : msg))
      );
      await Promise.all([
        autoFetchStats && fetchStats(),
        autoFetchUpcoming && fetchUpcomingMessages(),
      ]);
      return cancelledMessage;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [autoFetchStats, autoFetchUpcoming, fetchStats, fetchUpcomingMessages]);

  // Update filter
  const updateFilter = useCallback((newFilter: ScheduledMessageFilter) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  }, []);

  // Reset filter
  const resetFilter = useCallback(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetchUpcoming) {
      fetchUpcomingMessages();
    }
    if (autoFetchStats) {
      fetchStats();
    }
  }, [autoFetchUpcoming, autoFetchStats, fetchUpcomingMessages, fetchStats]);

  return {
    // Data
    messages,
    upcomingMessages,
    stats,
    loading,
    error,
    filter,

    // Methods
    fetchMessages,
    fetchUpcomingMessages,
    fetchStats,
    createMessage,
    updateMessage,
    cancelMessage,
    updateFilter,
    resetFilter,
  };
};

export default useScheduledMessages;
