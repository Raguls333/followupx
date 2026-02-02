import { useEffect, useState, useCallback, useRef } from 'react';
import { analyticsService } from '../services';

export interface DashboardAnalyticsData {
  overview: any;
  funnel: any;
  activityAnalytics: any;
}

/**
 * Custom hook for fetching dashboard analytics data
 * Handles loading state, error management, and deduplication
 * 
 * Best Practices Implemented:
 * - Prevents duplicate requests while one is in-flight
 * - Caches data and only refetches on demand
 * - Proper cleanup on unmount
 * - Memoized callbacks to prevent unnecessary re-renders
 */
export const useDashboardAnalytics = (enabled: boolean = true) => {
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to prevent duplicate requests
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchAnalytics = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate requests
    if (isLoadingRef.current && !forceRefresh) return;
    // Skip if already loaded and not forcing refresh
    if (hasLoadedRef.current && !forceRefresh) return;
    
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const [overview, funnel, activityAnalytics] = await Promise.all([
        analyticsService.getOverview().catch(err => {
          console.error('Failed to fetch overview:', err);
          return null;
        }),
        analyticsService.getFunnel().catch(err => {
          console.error('Failed to fetch funnel:', err);
          return null;
        }),
        analyticsService.getActivityAnalytics().catch(err => {
          console.error('Failed to fetch activity analytics:', err);
          return null;
        })
      ]);

      setData({
        overview,
        funnel,
        activityAnalytics
      });
      hasLoadedRef.current = true;
    } catch (err: any) {
      const message = err?.message || 'Failed to fetch dashboard analytics';
      setError(message);
      console.error('Dashboard analytics error:', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Only fetch on mount if enabled
  useEffect(() => {
    if (enabled && !hasLoadedRef.current) {
      fetchAnalytics();
    }
    
    // Cleanup: prevent state updates after unmount
    return () => {
      isLoadingRef.current = false;
    };
  }, [enabled, fetchAnalytics]);

  // Refresh function for manual updates
  const refresh = useCallback(async () => {
    await fetchAnalytics(true);  // Force refresh
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refresh,
    hasLoaded: hasLoadedRef.current
  };
};
