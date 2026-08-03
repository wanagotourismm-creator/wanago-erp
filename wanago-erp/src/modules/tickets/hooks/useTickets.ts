"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import { fetchTickets, updateTicketStatus, resolveTicketWithNotes, assignTicket, deleteTicket } from "@/modules/tickets/services/ticket.service";
import { useAuthStore } from "@/store/auth.store";
import type { Ticket, TicketStatus } from "@/modules/tickets/types";

export function useTickets() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTickets(await fetchTickets()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: TicketStatus) {
    try {
      const existing = tickets.find((t) => t.id === id);
      await updateTicketStatus(id, status, existing?.firstRespondedAt);
      setTickets((p) => p.map((t) => (t.id === id ? { ...t, ticketStatus: status } : t)));
      return { error: null };
    } catch { return { error: "Failed to update ticket" }; }
  }

  // Resolving (unlike other status changes) requires notes describing the
  // actual fix — those notes get summarized into the searchable knowledge
  // base right after (fire-and-forget, best-effort, never blocks this).
  async function resolveTicket(id: string, resolutionNotes: string) {
    try {
      const existing = tickets.find((t) => t.id === id);
      await resolveTicketWithNotes(id, resolutionNotes, existing?.firstRespondedAt);
      setTickets((p) => p.map((t) => (t.id === id ? { ...t, ticketStatus: "resolved", resolutionNotes } : t)));

      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      if (idToken) {
        fetch(`/api/tickets/${id}/summarize-resolution`, {
          method: "POST",
          headers: { authorization: `Bearer ${idToken}` },
        }).catch(() => {});
      }
      return { error: null };
    } catch { return { error: "Failed to resolve ticket" }; }
  }

  async function assignToMe(id: string) {
    if (!user) return { error: "Not signed in" };
    try {
      const existing = tickets.find((t) => t.id === id);
      await assignTicket(id, user.uid, user.displayName ?? user.email, existing?.firstRespondedAt);
      setTickets((p) => p.map((t) => (t.id === id ? { ...t, assignedToId: user.uid, assignedToName: user.displayName ?? user.email, ticketStatus: "in_progress" } : t)));
      return { error: null };
    } catch { return { error: "Failed to assign ticket" }; }
  }

  async function removeTicket(id: string) {
    try {
      await deleteTicket(id);
      setTickets((p) => p.filter((t) => t.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete ticket" }; }
  }

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.ticketStatus === "open").length,
    inProgress: tickets.filter((t) => t.ticketStatus === "in_progress").length,
    resolved: tickets.filter((t) => t.ticketStatus === "resolved" || t.ticketStatus === "closed").length,
  };

  return { tickets, loading, stats, load, setStatus, resolveTicket, assignToMe, removeTicket };
}
