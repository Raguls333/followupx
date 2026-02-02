
/**
 * Authentication Service
 */


  import api, { setAuthToken, clearAuthToken } from './api';


export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  industry?: string;
  profileImage?: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  role: 'owner' | 'manager' | 'rep';
  settings?: {
    timezone: string;
    notifications: {
      emailReminders: boolean;
      dailySummary: boolean;
      weeklyReport: boolean;
      inAppNotifications: boolean;
    };
    defaultFollowUpDays: number;
  };
  lastLogin?: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
  industry?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  /**
   * Register a new user
   */
  register: async (payload: RegisterPayload): Promise<User> => {
    const response = await api.post<LoginResponse>('/auth/register', payload);
    setAuthToken(response.data.token);
    return response.data.user;
  },

  /**
   * Login user
   */
  login: async (payload: LoginPayload): Promise<User> => {
    const response = await api.post<LoginResponse>('/auth/login', payload);
    setAuthToken(response.data.token);
    return response.data.user;
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
      return response.data.user;
    } catch {
      return null;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    clearAuthToken();
  },

  /**
   * Update profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<{ success: boolean; data: { user: User } }>('/auth/profile', data);
    return response.data.user;
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.put('/auth/password', { currentPassword, newPassword });
  },

  /**
   * Update notification settings
   */
  updateNotificationSettings: async (settings: {
    emailReminders?: boolean;
    dailySummary?: boolean;
    weeklyReport?: boolean;
    inAppNotifications?: boolean;
  }): Promise<void> => {
    await api.patch('/auth/settings/notifications', settings);
  },

  /**
   * Accept invite and activate account
   */
  acceptInvite: async ({ token, password, name }: { token: string, password: string, name: string }): Promise<User> => {
    const response = await api.post<LoginResponse>('/auth/accept-invite', { token, password, name });
    setAuthToken(response.data.token);
    return response.data.user;
  },
};

export default authService;
