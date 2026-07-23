"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchVendorRates, createVendorRate, updateVendorRate, deleteVendorRate,
} from "@/modules/vendor-portal/services/vendor-portal.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { VendorRate, VendorRateFormData } from "@/modules/vendor-portal/types";

export function useVendorRates() {
  const [rates, setRates]   = useState<VendorRate[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRates(await fetchVendorRates());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addRate(data: VendorRateFormData & { supplierName: string }): Promise<{ error: string | null }> {
    try {
      const rate = await createVendorRate(data, user?.uid ?? "");
      setRates(prev => [...prev, rate]);
      logActivity({
        entityType: "VendorRate", entityName: rate.serviceName, action: "created",
        detail: `Added rate "${rate.serviceName}" for ${rate.supplierName}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to add rate" };
    }
  }

  async function editRate(id: string, data: Partial<VendorRateFormData>): Promise<{ error: string | null }> {
    try {
      await updateVendorRate(id, data);
      setRates(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      logActivity({
        entityType: "VendorRate", entityName: data.serviceName ?? id, action: "updated",
        detail: `Updated rate "${data.serviceName ?? id}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to update rate" };
    }
  }

  async function removeRate(rate: VendorRate): Promise<{ error: string | null }> {
    try {
      await deleteVendorRate(rate.id);
      setRates(prev => prev.filter(r => r.id !== rate.id));
      logActivity({
        entityType: "VendorRate", entityName: rate.serviceName, action: "deleted",
        detail: `Deleted rate "${rate.serviceName}" for ${rate.supplierName}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to delete rate" };
    }
  }

  return { rates, loading, addRate, editRate, removeRate, reload: load };
}
