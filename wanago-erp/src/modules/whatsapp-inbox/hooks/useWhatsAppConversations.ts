"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribeToConversations, assignConversation } from "@/modules/whatsapp-inbox/services/whatsapp-inbox.service";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee } from "@/modules/dashboard/hooks/useCurrentEmployee";
import { scopeByAssignee } from "@/lib/rbac-scope";
import type { WhatsAppConversation } from "@/modules/whatsapp-inbox/types";

export function useWhatsAppConversations() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const { employee } = useCurrentEmployee();

  useEffect(() => {
    const unsub = subscribeToConversations((items) => {
      setConversations(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  // A role without whatsapp:view_all only sees conversations assigned to
  // them (or unassigned) — same "unassigned or mine" rule enforced
  // server-side in firestore.rules (canViewAssigned).
  const scoped = useMemo(
    () => scopeByAssignee(conversations, user?.systemRole ?? "sales", employee?.id ?? null, "whatsapp:view_all"),
    [conversations, user?.systemRole, employee?.id]
  );

  async function claim(conversationId: string): Promise<{ error: string | null }> {
    if (!employee) return { error: "No employee profile is linked to your account yet." };
    try {
      await assignConversation(conversationId, employee.id, employee.fullName);
      return { error: null };
    } catch {
      return { error: "Failed to claim this conversation." };
    }
  }

  return {
    conversations: scoped, loading,
    currentEmployeeId: employee?.id ?? null,
    currentEmployeeName: employee?.fullName ?? null,
    claim,
  };
}
