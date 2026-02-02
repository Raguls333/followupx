/**
 * useWhatsApp Hook
 * Custom hook for WhatsApp template management and message generation
 */

import { useState, useEffect, useCallback } from 'react';
import {
  whatsappService,
  Template,
  TemplateCategory,
  CreateTemplatePayload,
} from '../services';

interface UseTemplatesReturn {
  templates: Template[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTemplate: (payload: CreateTemplatePayload) => Promise<Template | null>;
  updateTemplate: (id: string, payload: Partial<CreateTemplatePayload>) => Promise<Template | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
}

interface UseWhatsAppLinkReturn {
  generateLink: (
    phone: string,
    templateId?: string,
    leadId?: string,
    variables?: Record<string, string>
  ) => Promise<string | null>;
  isGenerating: boolean;
  error: string | null;
}

/**
 * Hook for managing WhatsApp templates
 */
export function useTemplates(category?: TemplateCategory): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await whatsappService.getTemplates(category);
      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(
    async (payload: CreateTemplatePayload): Promise<Template | null> => {
      try {
        const template = await whatsappService.createTemplate(payload);
        setTemplates((prev) => [template, ...prev]);
        return template;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create template');
        return null;
      }
    },
    []
  );

  const updateTemplate = useCallback(
    async (id: string, payload: Partial<CreateTemplatePayload>): Promise<Template | null> => {
      try {
        const template = await whatsappService.updateTemplate(id, payload);
        setTemplates((prev) => prev.map((t) => (t._id === id ? template : t)));
        return template;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update template');
        return null;
      }
    },
    []
  );

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      await whatsappService.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  }, []);

  return {
    templates,
    isLoading,
    error,
    refresh: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

/**
 * Hook for generating WhatsApp links
 */
export function useWhatsAppLink(): UseWhatsAppLinkReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateLink = useCallback(
    async (
      phone: string,
      templateId?: string,
      leadId?: string,
      variables?: Record<string, string>
    ): Promise<string | null> => {
      setIsGenerating(true);
      setError(null);
      try {
        const data = await whatsappService.generateLink(phone, templateId, leadId, variables);
        return data.link;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate WhatsApp link');
        return null;
      }
    },
    []
  );

  return { generateLink, isGenerating, error };
}

/**
 * Hook for quick WhatsApp messaging
 */
export function useQuickWhatsApp() {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openWhatsApp = useCallback(
    async (
      phone: string,
      templateId?: string,
      leadId?: string,
      variables?: Record<string, string>
    ): Promise<boolean> => {
      setIsOpening(true);
      setError(null);
      try {
        const data = await whatsappService.generateLink(phone, templateId, leadId, variables);
        window.open(data.link, '_blank');
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open WhatsApp');
        return false;
      } finally {
        setIsOpening(false);
      }
    },
    []
  );

  const openWithCustomMessage = useCallback(
    (phone: string, message: string): boolean => {
      try {
        // Format phone number (remove non-digits)
        const formattedPhone = phone.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(message);
        const link = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        window.open(link, '_blank');
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open WhatsApp');
        return false;
      }
    },
    []
  );

  return { openWhatsApp, openWithCustomMessage, isOpening, error };
}

/**
 * Hook for template preview with variable substitution
 */
export function useTemplatePreview() {
  const [preview, setPreview] = useState<string>('');

  const generatePreview = useCallback(
    (template: Template, variables: Record<string, string>): string => {
      let content = template.content;

      // Replace variables in the format {{variableName}}
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, value);
      });

      setPreview(content);
      return content;
    },
    []
  );

  const extractVariables = useCallback((template: Template): string[] => {
    const matches = template.content.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map((match) => match.replace(/\{\{|\}\}/g, ''));
  }, []);

  return { preview, generatePreview, extractVariables };
}

export default {
  useTemplates,
  useWhatsAppLink,
  useQuickWhatsApp,
  useTemplatePreview,
};
