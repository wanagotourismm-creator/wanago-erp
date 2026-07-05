"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchTickets, updateTicketStatus, assignTicket, deleteTicket } from "@/modules/tickets/services/ticket.service";
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
      await updateTicketStatus(id, status);
      setTickets((p) => p.map((t) => (t.id === id ? { ...t, ticketStatus: status } : t)));
      return { error: null };
    } catch { return { error: "Failed to update ticket" }; }
  }

  async function assignToMe(id: string) {
    if (!user) return { error: "Not signed in" };
    try {
      await assignTicket(id, user.uid, user.displayName ?? user.email);
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

  return { tickets, loading, stats, load, setStatus, assignToMe, removeTicket };
}
