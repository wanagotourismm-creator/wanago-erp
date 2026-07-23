"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchVendorAvailability, createVendorAvailability, updateVendorAvailability, deleteVendorAvailability,
} from "@/modules/vendor-portal/services/vendor-portal.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { VendorAvailability, VendorAvailabilityFormData } from "@/modules/vendor-portal/types";

export function useVendorAvailability() {
  const [entries, setEntries] = useState<VendorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await fetchVendorAvailability());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addAvailability(data: VendorAvailabilityFormData & { supplierName: string }): Promise<{ error: string | null }> {
    try {
      const entry = await createVendorAvailability(data, user?.uid ?? "");
      setEntries(prev => [...prev, entry]);
      logActivity({
        entityType: "VendorAvailability", entityName: entry.resourceLabel, action: "created",
        detail: `Added availability "${entry.resourceLabel}" for ${entry.supplierName}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to add availability" };
    }
  }

  async function editAvailability(id: string, data: Partial<VendorAvailabilityFormData>): Promise<{ error: string | null }> {
    try {
      await updateVendorAvailability(id, data);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
      logActivity({
        entityType: "VendorAvailability", entityName: data.resourceLabel ?? id, action: "updated",
        detail: `Updated availability "${data.resourceLabel ?? id}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to update availability" };
    }
  }

  async function removeAvailability(entry: VendorAvailability): Promise<{ error: string | null }> {
    try {
      await deleteVendorAvailability(entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      logActivity({
        entityType: "VendorAvailability", entityName: entry.resourceLabel, action: "deleted",
        detail: `Deleted availability "${entry.resourceLabel}" for ${entry.supplierName}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to delete availability" };
    }
  }

  return { entries, loading, addAvailability, editAvailability, removeAvailability, reload: load };
}
