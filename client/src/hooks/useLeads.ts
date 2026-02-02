/**
 * useLeads Hook
 * Custom hook for managing leads data
 */

import { useState, useEffect, useCallback } from 'react';
import { leadService, Lead, LeadFilters, CreateLeadPayload } from '../services';

interface UseLeadsReturn {
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  filters: LeadFilters;
  setFilters: (filters: LeadFilters) => void;
  refreshLeads: () => Promise<void>;
  createLead: (payload: CreateLeadPayload) => Promise<Lead>;
  updateLead: (id: string, payload: Partial<CreateLeadPayload>) => Promise<Lead>;
  deleteLead: (id: string) => Promise<void>;
  updateLeadStatus: (id: string, status: string, lostReason?: string) => Promise<Lead>;
}

export function useLeads(initialFilters: LeadFilters = {}): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20,
  });
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadService.getLeads(filters);
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const refreshLeads = useCallback(async () => {
    await fetchLeads();
  }, [fetchLeads]);

  const createLead = useCallback(async (payload: CreateLeadPayload): Promise<Lead> => {
    const newLead = await leadService.createLead(payload);
    setLeads(prev => [newLead, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
    return newLead;
  }, []);

  const updateLead = useCallback(async (id: string, payload: Partial<CreateLeadPayload>): Promise<Lead> => {
    const updatedLead = await leadService.updateLead(id, payload);
    setLeads(prev => prev.map(lead => (lead._id === id ? updatedLead : lead)));
    return updatedLead;
  }, []);

  const deleteLead = useCallback(async (id: string): Promise<void> => {
    await leadService.deleteLead(id);
    setLeads(prev => prev.filter(lead => lead._id !== id));
    setPagination(prev => ({ ...prev, total: prev.total - 1 }));
  }, []);

  const updateLeadStatus = useCallback(
    async (id: string, status: string, lostReason?: string): Promise<Lead> => {
      const updatedLead = await leadService.updateLeadStatus(id, status, lostReason);
      setLeads(prev => prev.map(lead => (lead._id === id ? updatedLead : lead)));
      return updatedLead;
    },
    []
  );

  return {
    leads,
    isLoading,
    error,
    pagination,
    filters,
    setFilters,
    refreshLeads,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStatus,
  };
}

export default useLeads;
