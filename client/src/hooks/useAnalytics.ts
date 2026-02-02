/**
 * useAnalytics Hook
 * Custom hook for fetching analytics and dashboard data
 */

import { useState, useEffect, useCallback } from 'react';
import {
  analyticsService,
  OverviewData,
  FunnelData,
  ActivityAnalytics,
  RevenueData,
  DashboardData,
} from '../services';

interface UseOverviewReturn {
  data: OverviewData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseFunnelReturn {
  data: FunnelData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseActivityAnalyticsReturn {
  data: ActivityAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseRevenueReturn {
  data: RevenueData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching overview analytics
 */
export function useOverview(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): UseOverviewReturn {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getOverview(period);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overview data');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}

/**
 * Hook for fetching funnel analytics
 */
export function useFunnel(startDate?: string, endDate?: string): UseFunnelReturn {
  const [data, setData] = useState<FunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getFunnel(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch funnel data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}

/**
 * Hook for fetching activity analytics
 */
export function useActivityAnalytics(
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
): UseActivityAnalyticsReturn {
  const [data, setData] = useState<ActivityAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getActivityAnalytics(startDate, endDate, groupBy);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity analytics');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}

/**
 * Hook for fetching revenue analytics
 */
export function useRevenue(
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'month'
): UseRevenueReturn {
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getRevenue(startDate, endDate, groupBy);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch revenue data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}

/**
 * Hook for fetching complete dashboard data
 */
export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}

/**
 * Hook for exporting analytics data
 */
export function useAnalyticsExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(
    async (
      type: 'leads' | 'tasks' | 'activities' | 'full',
      format: 'csv' | 'xlsx' = 'csv',
      startDate?: string,
      endDate?: string
    ): Promise<Blob | null> => {
      setIsExporting(true);
      setError(null);
      try {
        const blob = await analyticsService.exportData(type, format, startDate, endDate);
        return blob;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export data');
        return null;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const downloadExport = useCallback(
    async (
      type: 'leads' | 'tasks' | 'activities' | 'full',
      format: 'csv' | 'xlsx' = 'csv',
      startDate?: string,
      endDate?: string,
      filename?: string
    ): Promise<boolean> => {
      const blob = await exportData(type, format, startDate, endDate);
      if (!blob) return false;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `followupx-${type}-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    },
    [exportData]
  );

  return { isExporting, error, exportData, downloadExport };
}

export default {
  useOverview,
  useFunnel,
  useActivityAnalytics,
  useRevenue,
  useDashboard,
  useAnalyticsExport,
};
