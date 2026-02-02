/**
 * useTasks Hook
 * Custom hook for managing tasks data
 */

import { useState, useEffect, useCallback } from 'react';
import { taskService, Task, TaskFilters, CreateTaskPayload, TodaysDashboard, CompleteTaskPayload } from '../services';

interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;
  refreshTasks: () => Promise<void>;
  createTask: (payload: CreateTaskPayload) => Promise<Task>;
  updateTask: (id: string, payload: Partial<CreateTaskPayload>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string, payload?: CompleteTaskPayload) => Promise<{ task: Task; followUpTask?: Task }>;
  rescheduleTask: (id: string, newDueDate: string, reason?: string) => Promise<Task>;
}

export function useTasks(initialFilters: TaskFilters = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20,
  });
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskService.getTasks(filters);
      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (payload: CreateTaskPayload): Promise<Task> => {
    const newTask = await taskService.createTask(payload);
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);

  const updateTask = useCallback(async (id: string, payload: Partial<CreateTaskPayload>): Promise<Task> => {
    const updatedTask = await taskService.updateTask(id, payload);
    setTasks(prev => prev.map(task => (task._id === id ? updatedTask : task)));
    return updatedTask;
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    await taskService.deleteTask(id);
    setTasks(prev => prev.filter(task => task._id !== id));
  }, []);

  const completeTask = useCallback(
    async (id: string, payload?: CompleteTaskPayload): Promise<{ task: Task; followUpTask?: Task }> => {
      const result = await taskService.completeTask(id, payload);
      setTasks(prev => prev.map(task => (task._id === id ? result.task : task)));
      return result;
    },
    []
  );

  const rescheduleTask = useCallback(
    async (id: string, newDueDate: string, reason?: string): Promise<Task> => {
      const updatedTask = await taskService.rescheduleTask(id, newDueDate, reason);
      setTasks(prev => prev.map(task => (task._id === id ? updatedTask : task)));
      return updatedTask;
    },
    []
  );

  return {
    tasks,
    isLoading,
    error,
    pagination,
    filters,
    setFilters,
    refreshTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    rescheduleTask,
  };
}

/**
 * useTodaysDashboard Hook
 * Fetches today's task dashboard (overdue, today, upcoming)
 */
export function useTodaysDashboard(): {
  dashboard: TodaysDashboard | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [dashboard, setDashboard] = useState<TodaysDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskService.getTodaysDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboard,
    isLoading,
    error,
    refresh: fetchDashboard,
  };
}

export default useTasks;
