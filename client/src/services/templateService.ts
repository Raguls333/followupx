/**
 * Template Service
 */

import api from './api';

export interface TemplateVariable {
  type: string;
  label: string;
}

export interface Template {
  _id: string;
  userId?: string;
  name: string;
  category: 'initial_contact' | 'follow_up' | 'appointment' | 'closing' | 're_engagement' | 'thank_you' | 'custom';
  message: string;
  variables: string[];
  usageCount: number;
  lastUsed?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesResponse {
  success: boolean;
  data: Template[];
}

export interface TemplateResponse {
  success: boolean;
  data: Template;
}

export interface RenderResult {
  success: boolean;
  data: {
    message: string;
    variables: string[];
  };
}

export const templateService = {
  /**
   * Get all templates (system + user's)
   */
  getTemplates: async (): Promise<Template[]> => {
    const response = await api.get<TemplatesResponse>('/templates');
    return response.data;
  },

  /**
   * Get single template
   */
  getTemplate: async (id: string): Promise<Template> => {
    const response = await api.get<TemplateResponse>(`/templates/${id}`);
    return response.data;
  },

  /**
   * Create new template
   */
  createTemplate: async (payload: {
    name: string;
    category: string;
    message: string;
    variables?: string[];
  }): Promise<Template> => {
    const response = await api.post<TemplateResponse>('/templates', payload);
    return response.data;
  },

  /**
   * Update template
   */
  updateTemplate: async (id: string, payload: Partial<Template>): Promise<Template> => {
    const response = await api.put<TemplateResponse>(`/templates/${id}`, payload);
    return response.data;
  },

  /**
   * Delete template
   */
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  /**
   * Render template with variables replaced
   */
  renderTemplate: async (templateId: string, variables: Record<string, string>): Promise<{ message: string; variables: string[] }> => {
    const response = await api.post<RenderResult>('/templates/render', {
      templateId,
      variables
    });
    return response.data;
  },

  /**
   * Mark template as used (increment usage count)
   */
  useTemplate: async (id: string): Promise<Template> => {
    const response = await api.patch<TemplateResponse>(`/templates/${id}/use`, {});
    return response.data;
  }
};

export default templateService;
