/**
 * Team Service
 */

import api from './api';
import { type User } from './authService';
import { type Lead } from './leadService';
import { type Activity } from './activityService';

export interface TeamMember extends User {
  stats: {
    leadsCount: number;
    pendingTasks: number;
    completedTasksLast30Days: number;
  };
}

export interface TeamMembersResponse {
  success: boolean;
  data: {
    members: TeamMember[];
    count: number;
  };
}

export interface TeamStatsResponse {
  success: boolean;
  data: {
    team: {
      totalLeads: number;
      activeLeads: number;
      totalTasks: number;
      completedTasksThisMonth: number;
      dealsWonThisMonth: number;
      memberCount: number;
    };
    members: Array<{
      _id: string;
      name: string;
      email: string;
      role: string;
      leadsCount: number;
      completedTasks: number;
    }>;
  };
}

export interface TeamActivityResponse {
  success: boolean;
  data: {
    activities: Activity[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export const teamService = {
  /**
   * Get team members
   */
  getMembers: async (): Promise<TeamMembersResponse['data']> => {
    const response = await api.get<TeamMembersResponse>('/team/members');
    return response.data;
  },

  /**
   * Invite team member
   */
  inviteMember: async (email: string, role: 'manager' | 'rep'): Promise<void> => {
    await api.post('/team/invite', { email, role });
  },

  /**
   * Remove team member
   */
  removeMember: async (userId: string): Promise<void> => {
    await api.delete(`/team/members/${userId}`);
  },

  /**
   * Update member role
   */
  updateMemberRole: async (userId: string, role: 'manager' | 'rep'): Promise<TeamMember> => {
    const response = await api.patch<{ success: boolean; data: { member: TeamMember } }>(
      `/team/members/${userId}/role`,
      { role }
    );
    return response.data.member;
  },

  /**
   * Assign lead to team member
   */
  assignLead: async (leadId: string, userId: string, reason?: string): Promise<Lead> => {
    const response = await api.post<{ success: boolean; data: { lead: Lead } }>('/team/assign-lead', {
      leadId,
      userId,
      reason,
    });
    return response.data.lead;
  },

  /**
   * Get team activity feed
   */
  getTeamActivity: async (
    userId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 50
  ): Promise<TeamActivityResponse['data']> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('page', String(page));
    params.append('limit', String(limit));
    const response = await api.get<TeamActivityResponse>(`/team/activity?${params.toString()}`);
    return response.data;
  },

  /**
   * Get team statistics
   */
  getTeamStats: async (): Promise<TeamStatsResponse['data']> => {
    const response = await api.get<TeamStatsResponse>('/team/stats');
    return response.data;
  },
};

export default teamService;
