"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, generateVendorPortalToken,
} from "@/modules/suppliers/services/supplier.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Supplier, SupplierFormData } from "@/modules/suppliers/types";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async (filters?: { category?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSuppliers(filters);
      setSuppliers(data);
    } catch {
      setError("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addSupplier(data: SupplierFormData): Promise<{ error: string | null }> {
    try {
      const supplier = await createSupplier(data, user?.uid ?? "");
      setSuppliers(prev => [supplier, ...prev]);
      logActivity({
        entityType: "Supplier", entityName: supplier.name, action: "created",
        detail: `Added supplier ${supplier.refNumber}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create supplier" };
    }
  }

  async function editSupplier(
    id: string, data: Partial<SupplierFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateSupplier(id, data);
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
      return { error: null };
    } catch {
      return { error: "Failed to update supplier" };
    }
  }

  async function removeSupplier(id: string): Promise<{ error: string | null }> {
    try {
      const supplier = suppliers.find(s => s.id === id);
      await deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      if (supplier) {
        logActivity({
          entityType: "Supplier", entityName: supplier.name, action: "deleted",
          detail: `Deleted supplier ${supplier.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete supplier" };
    }
  }

  async function generateVendorLink(supplier: Supplier): Promise<{ token: string | null; error: string | null }> {
    try {
      const token = await generateVendorPortalToken(supplier);
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, vendorPortalToken: token } : s));
      return { token, error: null };
    } catch {
      return { token: null, error: "Failed to generate vendor link" };
    }
  }

  return { suppliers, loading, error, load, addSupplier, editSupplier, removeSupplier, generateVendorLink };
}
