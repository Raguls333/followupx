import { api } from './api';

export interface ScheduledMessage {
  _id?: string;
  userId: string;
  leadId: string;
  taskId?: string;
  type: 'whatsapp' | 'email' | 'sms' | 'call';
  content: string;
  scheduledTime: string | Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  template?: string;
  variables?: Record<string, any>;
  sentAt?: string | Date;
  failureReason?: string;
  retryCount?: number;
  lead?: any;
  task?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ScheduledMessageStats {
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  byType: Array<{ type: string; count: number }>;
}

export interface ScheduledMessageFilter {
  status?: 'pending' | 'sent' | 'failed' | 'cancelled';
  type?: 'whatsapp' | 'email' | 'sms' | 'call';
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
}

const ENDPOINT = '/scheduled-messages';

export const scheduledMessagesService = {
  /**
   * Get all scheduled messages with optional filters
   */
  async getScheduledMessages(filters?: ScheduledMessageFilter) {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.startDate) params.append('startDate', String(filters.startDate));
      if (filters?.endDate) params.append('endDate', String(filters.endDate));
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const queryString = params.toString();
      const url = queryString ? `${ENDPOINT}?${queryString}` : ENDPOINT;
      const response = await api.get(url);
      return (response as any).data.data;
    } catch (error: any) {
      throw error.response?.data?.message || 'Failed to fetch scheduled messages';
    }
  },

  /**
   * Get upcoming scheduled messages (next 7 days)
   */
  async getUpcomingMessages() {
    try {
      const response = await api.get(`${ENDPOINT}/upcoming`);
      return (response as any).data.data;
    } catch (error: any) {
      throw error.response?.data?.message || 'Failed to fetch upcoming messages';
    }
  },

  /**
   * Get scheduled messages statistics
   */
  async getMessageStats(): Promise<ScheduledMessageStats> {
    try {
      const response = await api.get(`${ENDPOINT}/stats`);
      return (response as any).data.data;
    } catch (error: any) {
      throw error.response?.data?.message || 'Failed to fetch message statistics';
    }
  },

  /**
   * Create a new scheduled message
   */
  async createScheduledMessage(data: Omit<ScheduledMessage, '_id' | 'createdAt' | 'updatedAt'>) {
    try {
      const response = await api.post(ENDPOINT, data);
      return (response as any).data.data;
    } catch (error: any) {
      throw error.response?.data?.message || 'Failed to create scheduled message';
    }
  },

  /**
   * Update an existing scheduled message (only pending messages can be updated)
   */
  async updateScheduledMessage(id: string, data: Partial<ScheduledMessage>) {
    try {
      const response = await api.put(`${ENDPOINT}/${id}`, data);
      return (response as any).data.data;
    } catch (error: any) {
      throw error.response?.data?.message || 'Failed to update scheduled message';
    }
  },

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(id: string) {
    try {
      const response = await api.delete(`${ENDPOINT}/${id}`);
      return (response as any).data.data;
    } catch (error: any) {
      throw error.response?.data?.message || 'Failed to cancel scheduled message';
    }
  },
};

export default scheduledMessagesService;
