"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchTrash, restoreFromTrash, permanentlyDelete } from "@/modules/admin/trash/services/trash.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { TrashEntry } from "@/modules/admin/trash/types";

export function useTrash() {
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTrash();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function restore(entry: TrashEntry): Promise<{ error: string | null }> {
    try {
      await restoreFromTrash(entry);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      logActivity({
        entityType: "Trash", entityName: entry.collectionName, action: "updated",
        detail: `Restored a record from ${entry.collectionName}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to restore" };
    }
  }

  async function purge(entryId: string): Promise<{ error: string | null }> {
    try {
      await permanentlyDelete(entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
      return { error: null };
    } catch {
      return { error: "Failed to permanently delete" };
    }
  }

  return { entries, loading, load, restore, purge };
}
