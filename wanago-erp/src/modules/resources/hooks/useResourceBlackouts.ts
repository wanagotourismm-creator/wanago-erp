"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchResourceBlackouts, createResourceBlackout, deleteResourceBlackout,
} from "@/modules/resources/services/resource.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { ResourceBlackout, ResourceBlackoutFormData } from "@/modules/resources/types";

export function useResourceBlackouts() {
  const [blackouts, setBlackouts] = useState<ResourceBlackout[]>([]);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBlackouts(await fetchResourceBlackouts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addBlackout(data: ResourceBlackoutFormData): Promise<{ error: string | null }> {
    try {
      const blackout = await createResourceBlackout(data, user?.uid ?? "");
      setBlackouts(prev => [...prev, blackout]);
      logActivity({
        entityType: "Resource Blackout", entityName: blackout.resourceName, action: "created",
        detail: `Blacked out "${blackout.resourceName}" from ${blackout.startDate} to ${blackout.endDate}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to add blackout" };
    }
  }

  async function removeBlackout(blackout: ResourceBlackout): Promise<{ error: string | null }> {
    try {
      await deleteResourceBlackout(blackout.id);
      setBlackouts(prev => prev.filter(b => b.id !== blackout.id));
      logActivity({
        entityType: "Resource Blackout", entityName: blackout.resourceName, action: "deleted",
        detail: `Removed blackout for "${blackout.resourceName}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to remove blackout" };
    }
  }

  return { blackouts, loading, addBlackout, removeBlackout, reload: load };
}
