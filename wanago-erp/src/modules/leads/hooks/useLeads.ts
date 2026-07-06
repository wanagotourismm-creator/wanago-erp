"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchLeads, createLead, updateLead,
  updateLeadStage, deleteLead, convertLeadToCustomer,
} from "@/modules/leads/services/lead.service";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee } from "@/modules/dashboard/hooks/useCurrentEmployee";
import { scopeByAssignee } from "@/lib/rbac-scope";
import { logActivity } from "@/lib/activity-log";
import type { Lead, LeadFormData } from "@/modules/leads/types";

export function useLeads() {
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { user } = useAuthStore();
  const { employee } = useCurrentEmployee();

  // A `sales` user only sees leads assigned to them; every other role
  // (including sales_head) sees the full unfiltered list.
  const scopedLeads = useMemo(
    () => scopeByAssignee(leads, user?.systemRole ?? "sales", employee?.id ?? null),
    [leads, user?.systemRole, employee?.id]
  );

  const load = useCallback(async (filters?: { stage?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads(filters);
      setLeads(data);
    } catch (e) {
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
      logActivity({
        entityType: "Lead", entityName: lead.name, action: "created",
        detail: `Added lead ${lead.refNumber} (${lead.destination})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create lead" };
    }
  }

  async function editLead(
    id: string, data: Partial<LeadFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateLead(id, data);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
      return { error: null };
    } catch {
      return { error: "Failed to update lead" };
    }
  }

  async function changeStage(
    id: string, stage: string
  ): Promise<void> {
    await updateLeadStage(id, stage);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));

    const lead = leads.find(l => l.id === id);
    if (lead) {
      logActivity({
        entityType: "Lead", entityName: lead.name, action: "status_changed",
        detail: `${lead.refNumber} moved to ${stage}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }

    if (stage === "won" && lead) {
      await convertLeadToCustomer({ ...lead, stage }, user?.uid ?? "");
    }
  }

  async function removeLead(id: string): Promise<{ error: string | null }> {
    try {
      const lead = leads.find(l => l.id === id);
      await deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      if (lead) {
        logActivity({
          entityType: "Lead", entityName: lead.name, action: "deleted",
          detail: `Deleted lead ${lead.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete lead" };
    }
  }

  return { leads: scopedLeads, loading, error, load, addLead, editLead, changeStage, removeLead };
}
