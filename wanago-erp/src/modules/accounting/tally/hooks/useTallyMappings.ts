"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchTallyMappings, createTallyMapping, updateTallyMapping, deleteTallyMapping,
} from "@/modules/accounting/tally/services/tally-mapping.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { TallyMapping, TallyMappingFormData } from "@/modules/accounting/tally/types";

export function useTallyMappings() {
  const [mappings, setMappings] = useState<TallyMapping[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMappings(await fetchTallyMappings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addMapping(data: TallyMappingFormData): Promise<{ error: string | null }> {
    try {
      const mapping = await createTallyMapping(data, user?.uid ?? "");
      setMappings(prev => [...prev, mapping]);
      logActivity({
        entityType: "Tally Mapping", entityName: mapping.sourceKey, action: "created",
        detail: `Mapped "${mapping.sourceKey}" to Tally ledger "${mapping.tallyLedgerName}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to add mapping" };
    }
  }

  async function editMapping(id: string, data: Partial<TallyMappingFormData>): Promise<{ error: string | null }> {
    try {
      await updateTallyMapping(id, data, user?.uid ?? "");
      await load(); // a "default_*" edit may have just created a real doc with a new id
      logActivity({
        entityType: "Tally Mapping", entityName: data.sourceKey ?? id, action: "updated",
        detail: `Updated Tally ledger mapping for "${data.sourceKey ?? id}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to update mapping" };
    }
  }

  async function removeMapping(mapping: TallyMapping): Promise<{ error: string | null }> {
    try {
      await deleteTallyMapping(mapping.id);
      setMappings(prev => prev.filter(m => m.id !== mapping.id));
      logActivity({
        entityType: "Tally Mapping", entityName: mapping.sourceKey, action: "deleted",
        detail: `Deleted Tally ledger mapping for "${mapping.sourceKey}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to delete mapping" };
    }
  }

  return { mappings, loading, addMapping, editMapping, removeMapping };
}
