/**
 * Lead Service
 */

import api from './api';

export interface LeadAssignee {
  _id: string;
  name: string;
  email: string;
  role?: 'owner' | 'manager' | 'rep';
}

export interface Lead {
  _id: string;
  userId: string | LeadAssignee;
  name: {
    first: string;
    last?: string;
  };
  fullName?: string;
  phone: string;
  email?: string;
  company?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  source: 'website' | 'referral' | 'cold_call' | 'social_media' | 'advertisement' | 'walk_in' | 'trade_show' | 'other';
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedValue: number;
  actualValue?: number;
  notes?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
  propertyInterest?: {
    type?: 'buy' | 'sell' | 'rent' | 'invest';
    budget?: { min?: number; max?: number };
    location?: string;
    propertyType?: 'apartment' | 'house' | 'villa' | 'plot' | 'commercial' | 'other';
  };
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  status?: string;
  source?: string;
  priority?: string;
  tags?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface LeadsResponse {
  success: boolean;
  data: {
    leads: Lead[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface LeadResponse {
  success: boolean;
  data: {
    lead: Lead;
    tasks?: unknown[];
    activities?: unknown[];
  };
}

export interface CreateLeadPayload {
  name: {
    first: string;
    last?: string;
  };
  phone: string;
  email?: string;
  company?: string;
  status?: string;
  source?: string;
  tags?: string[];
  priority?: string;
  estimatedValue?: number;
  notes?: string;
  propertyInterest?: Lead['propertyInterest'];
}

export interface ImportResult {
  success: boolean;
  data: {
    imported: number;
    skipped: number;
    errors: Array<{ row: number; reason: string }>;
  };
}

export interface AIRecoveryLead extends Lead {
  recovery: {
    category: 'cold' | 'stuck' | 'no_tasks';
    daysInactive: number;
    lastActivity?: {
      type: string;
      title: string;
      date: string;
    };
    suggestion: {
      action: string;
      template?: string;
      title: string;
      reason: string;
      message: string;
      bestTime?: string;
      priority?: string;
    };
    recoveryScore: number;
  };
  recoveryScore: number;
}

export interface AIRecoveryResponse {
  success: boolean;
  data: {
    leads: AIRecoveryLead[];
    summary: {
      totalRecoveryLeads: number;
      coldLeads: number;
      stuckLeads: number;
      noTaskLeads: number;
      revenueAtRisk: number;
    };
  };
}

export const leadService = {
  /**
   * Get all leads with filters
   */
  getLeads: async (filters: LeadFilters = {}): Promise<LeadsResponse['data']> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get<LeadsResponse>(`/leads?${params.toString()}`);
    return response.data;
  },

  /**
   * Get single lead
   */
  getLead: async (id: string): Promise<LeadResponse['data']> => {
    const response = await api.get<LeadResponse>(`/leads/${id}`);
    return response.data;
  },

  /**
   * Create new lead
   */
  createLead: async (payload: CreateLeadPayload): Promise<Lead> => {
    const response = await api.post<{ success: boolean; data: { lead: Lead } }>('/leads', payload);
    return response.data.lead;
  },

  /**
   * Update lead
   */
  updateLead: async (id: string, payload: Partial<CreateLeadPayload>): Promise<Lead> => {
    const response = await api.put<{ success: boolean; data: { lead: Lead } }>(`/leads/${id}`, payload);
    return response.data.lead;
  },

  /**
   * Update lead status
   */
  updateLeadStatus: async (id: string, status: string, lostReason?: string): Promise<Lead> => {
    const response = await api.patch<{ success: boolean; data: { lead: Lead } }>(
      `/leads/${id}/status`,
      { status, lostReason }
    );
    return response.data.lead;
  },

  /**
   * Delete lead (soft delete)
   */
  deleteLead: async (id: string): Promise<void> => {
    await api.delete(`/leads/${id}`);
  },

  /**
   * Check for duplicate phone
   */
  checkDuplicate: async (phone: string): Promise<{ exists: boolean; lead: Lead | null }> => {
    const response = await api.post<{ success: boolean; data: { exists: boolean; lead: Lead | null } }>(
      '/leads/check-duplicate',
      { phone }
    );
    return response.data;
  },

  /**
   * Import leads from CSV
   */
  importLeads: async (file: File): Promise<ImportResult['data']> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.upload<ImportResult>('/leads/import', formData);
    return response.data;
  },

  /**
   * Get AI recovery leads
   */
  getAIRecoveryLeads: async (): Promise<AIRecoveryResponse['data']> => {
    const response = await api.get<AIRecoveryResponse>('/leads/ai-recovery');
    return response.data;
  },

  /**
   * Get lead statistics
   */
  getLeadStats: async (): Promise<{
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    totalEstimatedValue: number;
    total: number;
  }> => {
    const response = await api.get<{ success: boolean; data: {
      byStatus: Record<string, number>;
      bySource: Record<string, number>;
      totalEstimatedValue: number;
      total: number;
    } }>('/leads/stats');
    return response.data;
  },
};

export default leadService;
