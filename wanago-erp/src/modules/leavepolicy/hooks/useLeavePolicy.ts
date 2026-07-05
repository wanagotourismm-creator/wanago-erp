"use client";

import { useState, useEffect } from "react";
import {
  fetchLeavePolicy, updateLeavePolicy, DEFAULT_LEAVE_POLICY, type LeavePolicy,
} from "@/modules/leavepolicy/services/leave-policy.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";

export function useLeavePolicy() {
  const [policy, setPolicy] = useState<LeavePolicy>(DEFAULT_LEAVE_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchLeavePolicy().then(setPolicy).finally(() => setLoading(false));
  }, []);

  async function save(data: LeavePolicy): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await updateLeavePolicy(data, user?.uid ?? "");
      setPolicy(data);
      logActivity({
        entityType: "Leave Policy", entityName: "Leave Policy", action: "updated",
        detail: "Updated leave types, entitlements, and weekly off days",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save leave policy" };
    } finally {
      setSaving(false);
    }
  }

  return { policy, loading, saving, save };
}
