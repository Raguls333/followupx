/**
 * Task Service
 */

import api from './api';
import { type Lead } from './leadService';

export interface Task {
  _id: string;
  userId: string;
  leadId: string | Lead;
  assignedTo?: string;
  title: string;
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'site_visit' | 'follow_up' | 'other';
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  dueTime?: string;
  status: 'pending' | 'completed' | 'cancelled';
  completedAt?: string;
  reminderAt?: string;
  reminderSent?: boolean;
  outcome?: 'successful' | 'no_answer' | 'callback_requested' | 'not_interested' | 'rescheduled' | 'other';
  outcomeNotes?: string;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  status?: string;
  type?: string;
  leadId?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface TasksResponse {
  success: boolean;
  data: {
    tasks: Task[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface TodaysDashboard {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
}

export interface CreateTaskPayload {
  title: string;
  type?: string;
  description?: string;
  priority?: string;
  leadId: string;
  dueDate: string;
  dueTime?: string;
  reminderAt?: string;
  assignedTo?: string;
}

export interface CompleteTaskPayload {
  outcome?: string;
  outcomeNotes?: string;
  createFollowUp?: boolean;
}

export const taskService = {
  /**
   * Get all tasks with filters
   */
  getTasks: async (filters: TaskFilters = {}): Promise<TasksResponse['data']> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get<TasksResponse>(`/tasks?${params.toString()}`);
    return response.data;
  },

  /**
   * Get today's dashboard (overdue, today, upcoming)
   */
  getTodaysDashboard: async (): Promise<TodaysDashboard> => {
    const response = await api.get<{ success: boolean; data: TodaysDashboard }>('/tasks/today');
    return response.data;
  },

  /**
   * Get single task
   */
  getTask: async (id: string): Promise<Task> => {
    const response = await api.get<{ success: boolean; data: { task: Task } }>(`/tasks/${id}`);
    return response.data.task;
  },

  /**
   * Create new task
   */
  createTask: async (payload: CreateTaskPayload): Promise<Task> => {
    const response = await api.post<{ success: boolean; data: { task: Task } }>('/tasks', payload);
    return response.data.task;
  },

  /**
   * Update task
   */
  updateTask: async (id: string, payload: Partial<CreateTaskPayload>): Promise<Task> => {
    const response = await api.put<{ success: boolean; data: { task: Task } }>(`/tasks/${id}`, payload);
    return response.data.task;
  },

  /**
   * Complete task
   */
  completeTask: async (id: string, payload: CompleteTaskPayload = {}): Promise<{ task: Task; followUpTask?: Task }> => {
    const response = await api.patch<{ success: boolean; data: { task: Task; followUpTask?: Task } }>(
      `/tasks/${id}/complete`,
      payload
    );
    return response.data;
  },

  /**
   * Reschedule task
   */
  rescheduleTask: async (id: string, newDueDate: string, reason?: string): Promise<Task> => {
    const response = await api.patch<{ success: boolean; data: { task: Task } }>(
      `/tasks/${id}/reschedule`,
      { newDueDate, reason }
    );
    return response.data.task;
  },

  /**
   * Snooze task reminder
   */
  snoozeTask: async (id: string, minutes: number): Promise<Task> => {
    const response = await api.patch<{ success: boolean; data: { task: Task } }>(
      `/tasks/${id}/snooze`,
      { minutes }
    );
    return response.data.task;
  },

  /**
   * Delete/cancel task
   */
  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  /**
   * Get task statistics
   */
  getTaskStats: async (): Promise<{
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    overdue: number;
    total: number;
  }> => {
    const response = await api.get<{ success: boolean; data: {
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      overdue: number;
      total: number;
    } }>('/tasks/stats');
    return response.data;
  },
};

export default taskService;
