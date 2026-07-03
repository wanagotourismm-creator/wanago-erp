"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchLeads, createLead, updateLead,
  updateLeadStage, deleteLead,
} from "@/modules/leads/services/lead.service";
import { useAuthStore } from "@/store/auth.store";
import type { Lead, LeadFormData } from "@/modules/leads/types";
import { LEAD_STAGES } from "@/lib/constants";

export function useLeads() {
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async (filters?: { stage?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads(filters);
      setLeads(data);
    } catch {
      setError("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addLead(data: LeadFormData): Promise<{ error: string | null }> {
    try {
      const lead = await createLead(data, user?.uid ?? "");
      setLeads(prev => [lead, ...prev]);
      return { error: null };
    } catch {
      return { error: "Failed to create lead" };
    }
  }

  async function editLead(id: string, data: Partial<LeadFormData>): Promise<{ error: string | null }> {
    try {
      await updateLead(id, data);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
      return { error: null };
    } catch {
      return { error: "Failed to update lead" };
    }
  }

  // ── changeStage — auto-creates customer if Won ─────────────
  async function changeStage(id: string, stage: string): Promise<void> {
    const lead = leads.find(l => l.id === id);
    await updateLeadStage(id, stage, lead, user?.uid);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));

    // Show toast notification if won
    if (stage === LEAD_STAGES.WON && lead) {
      console.log(`🎉 Lead "${lead.name}" marked as Won — customer auto-created!`);
    }
  }

  async function removeLead(id: string): Promise<{ error: string | null }> {
    try {
      await deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to delete lead" };
    }
  }

  return { leads, loading, error, load, addLead, editLead, changeStage, removeLead };
}
