/**
 * useTeam Hook
 * Custom hook for managing team members and team data
 */

import { useState, useEffect, useCallback } from 'react';
import {
  teamService,
  TeamMember,
  TeamStatsResponse,
  TeamActivityResponse,
  Lead,
} from '../services';

interface UseTeamMembersReturn {
  members: TeamMember[];
  count: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  inviteMember: (email: string, role: 'manager' | 'rep') => Promise<boolean>;
  removeMember: (userId: string) => Promise<boolean>;
  updateMemberRole: (userId: string, role: 'manager' | 'rep') => Promise<TeamMember | null>;
}

interface UseTeamStatsReturn {
  stats: TeamStatsResponse['data'] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseTeamActivityReturn {
  activities: TeamActivityResponse['data']['activities'];
  pagination: TeamActivityResponse['data']['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Hook for managing team members
 */
export function useTeamMembers(): UseTeamMembersReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await teamService.getMembers();
      setMembers(data.members);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team members');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = useCallback(
    async (email: string, role: 'manager' | 'rep'): Promise<boolean> => {
      try {
        await teamService.inviteMember(email, role);
        await fetchMembers();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to invite member');
        return false;
      }
    },
    [fetchMembers]
  );

  const removeMember = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        await teamService.removeMember(userId);
        setMembers((prev) => prev.filter((m) => m._id !== userId));
        setCount((prev) => prev - 1);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove member');
        return false;
      }
    },
    []
  );

  const updateMemberRole = useCallback(
    async (userId: string, role: 'manager' | 'rep'): Promise<TeamMember | null> => {
      try {
        const updatedMember = await teamService.updateMemberRole(userId, role);
        setMembers((prev) =>
          prev.map((m) => (m._id === userId ? updatedMember : m))
        );
        return updatedMember;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update member role');
        return null;
      }
    },
    []
  );

  return {
    members,
    count,
    isLoading,
    error,
    refresh: fetchMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
  };
}

/**
 * Hook for fetching team statistics
 */
export function useTeamStats(): UseTeamStatsReturn {
  const [stats, setStats] = useState<TeamStatsResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await teamService.getTeamStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}

/**
 * Hook for fetching team activity feed
 */
export function useTeamActivity(
  userId?: string,
  startDate?: string,
  endDate?: string,
  limit = 50
): UseTeamActivityReturn {
  const [activities, setActivities] = useState<TeamActivityResponse['data']['activities']>([]);
  const [pagination, setPagination] = useState<TeamActivityResponse['data']['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchActivity = useCallback(async (pageNum = 1, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await teamService.getTeamActivity(userId, startDate, endDate, pageNum, limit);
      if (append) {
        setActivities((prev) => [...prev, ...data.activities]);
      } else {
        setActivities(data.activities);
      }
      setPagination(data.pagination);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team activity');
    } finally {
      setIsLoading(false);
    }
  }, [userId, startDate, endDate, limit]);

  useEffect(() => {
    fetchActivity(1, false);
  }, [fetchActivity]);

  const loadMore = useCallback(async () => {
    if (pagination && page < pagination.pages) {
      await fetchActivity(page + 1, true);
    }
  }, [pagination, page, fetchActivity]);

  const refresh = useCallback(async () => {
    await fetchActivity(1, false);
  }, [fetchActivity]);

  return { activities, pagination, isLoading, error, refresh, loadMore };
}

/**
 * Hook for assigning leads to team members
 */
export function useLeadAssignment() {
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignLead = useCallback(
    async (leadId: string, userId: string, reason?: string): Promise<Lead | null> => {
      setIsAssigning(true);
      setError(null);
      try {
        const lead = await teamService.assignLead(leadId, userId, reason);
        return lead;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign lead');
        return null;
      } finally {
        setIsAssigning(false);
      }
    },
    []
  );

  return { isAssigning, error, assignLead };
}

export default {
  useTeamMembers,
  useTeamStats,
  useTeamActivity,
  useLeadAssignment,
};
