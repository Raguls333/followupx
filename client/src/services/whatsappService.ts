/**
 * WhatsApp Service
 */

import api from './api';

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
  language: 'en' | 'hi' | 'hinglish';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppLinkResponse {
  success: boolean;
  data: {
    link: string;
    phone: string;
    message: string;
    lead: {
      id: string;
      name: { first: string; last?: string };
      phone: string;
    };
    template?: {
      id: string;
      name: string;
    };
  };
}

export interface TemplatesResponse {
  success: boolean;
  data: {
    templates: Template[];
    grouped: Record<string, Template[]>;
  };
}

export interface CreateTemplatePayload {
  name: string;
  category?: string;
  message: string;
  language?: string;
  tags?: string[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}

export const whatsappService = {
  /**
   * Generate WhatsApp link
   */
  generateLink: async (
    leadId: string,
    templateId?: string,
    customMessage?: string
  ): Promise<WhatsAppLinkResponse['data']> => {
    const response = await api.post<WhatsAppLinkResponse>('/whatsapp/generate-link', {
      leadId,
      templateId,
      customMessage,
    });
    return response.data;
  },

  /**
   * Log WhatsApp send
   */
  logSend: async (leadId: string, message: string, templateId?: string): Promise<void> => {
    await api.post('/whatsapp/log-send', { leadId, message, templateId });
  },

  /**
   * Get all templates
   */
  getTemplates: async (category?: string, language?: string): Promise<TemplatesResponse['data']> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (language) params.append('language', language);
    const response = await api.get<TemplatesResponse>(`/whatsapp/templates?${params.toString()}`);
    return response.data;
  },

  /**
   * Get template categories
   */
  getCategories: async (): Promise<TemplateCategory[]> => {
    const response = await api.get<{ success: boolean; data: { categories: TemplateCategory[] } }>(
      '/whatsapp/templates/categories'
    );
    return response.data.categories;
  },

  /**
   * Create template
   */
  createTemplate: async (payload: CreateTemplatePayload): Promise<Template> => {
    const response = await api.post<{ success: boolean; data: { template: Template } }>(
      '/whatsapp/templates',
      payload
    );
    return response.data.template;
  },

  /**
   * Update template
   */
  updateTemplate: async (id: string, payload: Partial<CreateTemplatePayload>): Promise<Template> => {
    const response = await api.put<{ success: boolean; data: { template: Template } }>(
      `/whatsapp/templates/${id}`,
      payload
    );
    return response.data.template;
  },

  /**
   * Delete template
   */
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/whatsapp/templates/${id}`);
  },

  /**
   * Preview template with lead data
   */
  previewTemplate: async (
    templateId: string,
    leadId?: string
  ): Promise<{
    template: string;
    preview: string;
    variables: string[];
    lead?: { id: string; name: { first: string; last?: string } };
  }> => {
    const response = await api.post<{
      success: boolean;
      data: {
        template: string;
        preview: string;
        variables: string[];
        lead?: { id: string; name: { first: string; last?: string } };
      };
    }>(`/whatsapp/templates/${templateId}/preview`, { leadId });
    return response.data;
  },

  /**
   * Open WhatsApp link in new window
   */
  openWhatsApp: (link: string): void => {
    window.open(link, '_blank');
  },
};

export default whatsappService;
