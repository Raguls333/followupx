/**
 * Analytics Service
 */

import api from './api';

export interface OverviewData {
  totalLeads: number;
  newLeads: number;
  activeLeads: number;
  coldLeads: number;
  tasksCompleted: number;
  taskCompletionRate: number;
  dealsWon: number;
  dealsLost: number;
  winRate: number;
  trends: {
    leads: number;
    tasks: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface FunnelData {
  funnel: {
    new: number;
    contacted: number;
    qualified: number;
    proposal: number;
    negotiation: number;
    won: number;
    lost: number;
  };
  conversionRates: Record<string, number>;
  total: number;
}

export interface ActivityAnalytics {
  byType: Record<string, number>;
  byDay: Record<string, number>;
  byHour: Record<number, number>;
  summary: {
    totalActivities: number;
    whatsappSent: number;
    callsMade: number;
    emailsSent: number;
    tasksCompleted: number;
    mostActiveHour: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface RevenueData {
  wonDeals: {
    value: number;
    count: number;
  };
  pipeline: {
    value: number;
    count: number;
  };
  averageDealSize: number;
  winRate: number;
  byMonth: Record<string, { revenue: number; deals: number }>;
  period: {
    start: string;
    end: string;
  };
}

export interface DashboardData {
  todaysTasks: unknown[];
  overdueTasks: number;
  recentLeads: unknown[];
  recentActivities: unknown[];
  stats: {
    totalLeads: number;
    activeLeads: number;
    pendingTasks: number;
    dealsWonThisMonth: number;
  };
}

export const analyticsService = {
  /**
   * Get overview statistics
   */
  getOverview: async (startDate?: string, endDate?: string): Promise<OverviewData> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<{ success: boolean; data: OverviewData }>(
      `/analytics/overview?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get sales funnel data
   */
  getFunnel: async (): Promise<FunnelData> => {
    const response = await api.get<{ success: boolean; data: FunnelData }>('/analytics/funnel');
    return response.data;
  },

  /**
   * Get activity analytics
   */
  getActivityAnalytics: async (startDate?: string, endDate?: string): Promise<ActivityAnalytics> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<{ success: boolean; data: ActivityAnalytics }>(
      `/analytics/activities?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get revenue analytics
   */
  getRevenue: async (startDate?: string, endDate?: string): Promise<RevenueData> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<{ success: boolean; data: RevenueData }>(
      `/analytics/revenue?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get dashboard summary
   */
  getDashboard: async (): Promise<DashboardData> => {
    const response = await api.get<{ success: boolean; data: DashboardData }>('/analytics/dashboard');
    return response.data;
  },

  /**
   * Export data
   */
  exportData: async (dataType: 'leads' | 'tasks' | 'activities', format: 'csv' | 'json' = 'csv'): Promise<void> => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/analytics/export?dataType=${dataType}&format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('followupx_token')}`,
        },
      }
    );

    if (format === 'csv') {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  },
};

export default analyticsService;
