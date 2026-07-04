"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchOffices, createOffice, updateOffice, deleteOffice,
} from "@/modules/admin/offices/services/office.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Office, OfficeFormData } from "@/modules/admin/offices/types";

export function useOffices() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOffices();
      setOffices(data);
    } catch {
      setError("Failed to load offices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addOffice(data: OfficeFormData): Promise<{ error: string | null }> {
    try {
      const office = await createOffice(data, user?.uid ?? "");
      setOffices(prev => [...prev, office].sort((a, b) => a.name.localeCompare(b.name)));
      logActivity({
        entityType: "Office", entityName: office.name, action: "created",
        detail: `Added office ${office.name} (${office.code})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create office" };
    }
  }

  async function editOffice(
    id: string, data: Partial<OfficeFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateOffice(id, data);
      setOffices(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
      return { error: null };
    } catch {
      return { error: "Failed to update office" };
    }
  }

  async function removeOffice(id: string): Promise<{ error: string | null }> {
    try {
      const office = offices.find(o => o.id === id);
      await deleteOffice(id);
      setOffices(prev => prev.filter(o => o.id !== id));
      if (office) {
        logActivity({
          entityType: "Office", entityName: office.name, action: "deleted",
          detail: `Deleted office ${office.name}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete office" };
    }
  }

  return { offices, loading, error, load, addOffice, editOffice, removeOffice };
}
