/**
 * Activity Service
 */

import api from './api';

export interface Activity {
  _id: string;
  userId: string;
  leadId: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  taskId?: string;
  templateId?: string;
  timestamp: string;
  performedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface ActivityFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ActivitiesResponse {
  success: boolean;
  data: {
    activities: Activity[];
    pagination?: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
    total?: number;
  };
}

export interface CreateActivityPayload {
  leadId: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export const activityService = {
  /**
   * Get activities for a lead
   */
  getLeadActivities: async (leadId: string, filters: ActivityFilters = {}): Promise<ActivitiesResponse['data']> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get<ActivitiesResponse>(`/activities/lead/${leadId}?${params.toString()}`);
    return response.data;
  },

  /**
   * Get user's activity timeline
   */
  getActivityTimeline: async (filters: ActivityFilters = {}): Promise<ActivitiesResponse['data']> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get<ActivitiesResponse>(`/activities/timeline?${params.toString()}`);
    return response.data;
  },

  /**
   * Create activity
   */
  createActivity: async (payload: CreateActivityPayload): Promise<Activity> => {
    const response = await api.post<{ success: boolean; data: { activity: Activity } }>('/activities', payload);
    return response.data.activity;
  },

  /**
   * Log a call
   */
  logCall: async (data: {
    leadId: string;
    duration?: number;
    outcome?: string;
    notes?: string;
    direction?: 'outgoing' | 'incoming';
  }): Promise<Activity> => {
    const response = await api.post<{ success: boolean; data: { activity: Activity } }>('/activities/call', data);
    return response.data.activity;
  },

  /**
   * Log a note
   */
  logNote: async (leadId: string, content: string): Promise<Activity> => {
    const response = await api.post<{ success: boolean; data: { activity: Activity } }>('/activities/note', {
      leadId,
      content,
    });
    return response.data.activity;
  },

  /**
   * Get activity statistics
   */
  getActivityStats: async (startDate?: string, endDate?: string): Promise<{
    byType: Record<string, number>;
    byDay: Record<string, number>;
    total: number;
  }> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<{ success: boolean; data: {
      byType: Record<string, number>;
      byDay: Record<string, number>;
      total: number;
    } }>(`/activities/stats?${params.toString()}`);
    return response.data;
  },
};

export default activityService;
