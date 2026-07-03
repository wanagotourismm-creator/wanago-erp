"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/modules/suppliers/services/supplier.service";
import { useAuthStore } from "@/store/auth.store";
import type { Supplier, SupplierFormData } from "@/modules/suppliers/types";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try { setSuppliers(await fetchSuppliers()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addSupplier(data: SupplierFormData) {
    try {
      const s = await createSupplier(data, user?.uid ?? "");
      setSuppliers(p => [s, ...p]);
      return { error: null };
    } catch { return { error: "Failed to create supplier" }; }
  }

  async function editSupplier(id: string, data: Partial<SupplierFormData>) {
    try {
      await updateSupplier(id, data);
      setSuppliers(p => p.map(s => s.id === id ? { ...s, ...data } : s));
      return { error: null };
    } catch { return { error: "Failed to update supplier" }; }
  }

  async function removeSupplier(id: string) {
    try {
      await deleteSupplier(id);
      setSuppliers(p => p.filter(s => s.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete supplier" }; }
  }

  return { suppliers, loading, load, addSupplier, editSupplier, removeSupplier };
}
