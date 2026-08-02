"use client";

import { useState, useEffect } from "react";
import {
  fetchTicketSlaPolicy, updateTicketSlaPolicy, DEFAULT_TICKET_SLA_POLICY, type TicketSlaPolicy,
} from "@/modules/tickets/services/ticket-sla-policy.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";

export function useTicketSlaPolicy() {
  const [policy, setPolicy] = useState<TicketSlaPolicy>(DEFAULT_TICKET_SLA_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchTicketSlaPolicy().then(setPolicy).finally(() => setLoading(false));
  }, []);

  async function save(data: TicketSlaPolicy): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await updateTicketSlaPolicy(data, user?.uid ?? "");
      setPolicy(data);
      logActivity({
        entityType: "Ticket SLA Policy", entityName: "Ticket SLA Policy", action: "updated",
        detail: "Updated support ticket response/resolution SLA thresholds",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save SLA policy" };
    } finally {
      setSaving(false);
    }
  }

  return { policy, loading, saving, save };
}
