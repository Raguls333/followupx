/**
 * useActivities Hook
 * Custom hook for managing activities and activity timeline
 */

import { useState, useEffect, useCallback } from 'react';
import {
  activityService,
  Activity,
  ActivityFilters,
  CreateActivityPayload,
} from '../services';

interface UseLeadActivitiesReturn {
  activities: Activity[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

interface UseActivityTimelineReturn {
  activities: Activity[];
  total: number;
  isLoading: boolean;
  error: string | null;
  filters: ActivityFilters;
  setFilters: (filters: ActivityFilters) => void;
  refresh: () => Promise<void>;
}

interface UseActivityStatsReturn {
  stats: {
    byType: Record<string, number>;
    byDay: Record<string, number>;
    total: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching activities for a specific lead
 */
export function useLeadActivities(
  leadId: string,
  initialFilters: ActivityFilters = {}
): UseLeadActivitiesReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    pages: number;
    limit: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const fetchActivities = useCallback(
    async (pageNum = 1, append = false) => {
      if (!leadId) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await activityService.getLeadActivities(leadId, {
          ...filters,
          page: pageNum,
        });

        if (append) {
          setActivities((prev) => [...prev, ...data.activities]);
        } else {
          setActivities(data.activities);
        }

        if (data.pagination) {
          setPagination(data.pagination);
        }
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      } finally {
        setIsLoading(false);
      }
    },
    [leadId, filters]
  );

  useEffect(() => {
    fetchActivities(1, false);
  }, [fetchActivities]);

  const loadMore = useCallback(async () => {
    if (pagination && page < pagination.pages) {
      await fetchActivities(page + 1, true);
    }
  }, [pagination, page, fetchActivities]);

  const refresh = useCallback(async () => {
    await fetchActivities(1, false);
  }, [fetchActivities]);

  return { activities, pagination, isLoading, error, refresh, loadMore };
}

/**
 * Hook for fetching user's activity timeline
 */
export function useActivityTimeline(
  initialFilters: ActivityFilters = {}
): UseActivityTimelineReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>(initialFilters);

  const fetchTimeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await activityService.getActivityTimeline(filters);
      setActivities(data.activities);
      setTotal(data.total || data.activities.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timeline');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    activities,
    total,
    isLoading,
    error,
    filters,
    setFilters,
    refresh: fetchTimeline,
  };
}

/**
 * Hook for activity statistics
 */
export function useActivityStats(
  startDate?: string,
  endDate?: string
): UseActivityStatsReturn {
  const [stats, setStats] = useState<{
    byType: Record<string, number>;
    byDay: Record<string, number>;
    total: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await activityService.getActivityStats(startDate, endDate);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity stats');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}

/**
 * Hook for logging activities
 */
export function useActivityLogger() {
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createActivity = useCallback(
    async (payload: CreateActivityPayload): Promise<Activity | null> => {
      setIsLogging(true);
      setError(null);
      try {
        const activity = await activityService.createActivity(payload);
        return activity;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create activity');
        return null;
      } finally {
        setIsLogging(false);
      }
    },
    []
  );

  const logCall = useCallback(
    async (data: {
      leadId: string;
      duration?: number;
      outcome?: string;
      notes?: string;
      direction?: 'outgoing' | 'incoming';
    }): Promise<Activity | null> => {
      setIsLogging(true);
      setError(null);
      try {
        const activity = await activityService.logCall(data);
        return activity;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log call');
        return null;
      } finally {
        setIsLogging(false);
      }
    },
    []
  );

  const logNote = useCallback(
    async (leadId: string, content: string): Promise<Activity | null> => {
      setIsLogging(true);
      setError(null);
      try {
        const activity = await activityService.logNote(leadId, content);
        return activity;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log note');
        return null;
      } finally {
        setIsLogging(false);
      }
    },
    []
  );

  return { isLogging, error, createActivity, logCall, logNote };
}

export default {
  useLeadActivities,
  useActivityTimeline,
  useActivityStats,
  useActivityLogger,
};
