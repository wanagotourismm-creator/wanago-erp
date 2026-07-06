"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchPackages, createPackage, updatePackage, deletePackage,
} from "@/modules/packages/services/package.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Package, PackageFormData } from "@/modules/packages/types";

export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async (filters?: { packageStatus?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPackages(filters);
      setPackages(data);
    } catch {
      setError("Failed to load packages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addPackage(data: PackageFormData): Promise<{ error: string | null }> {
    try {
      const pkg = await createPackage(data, user?.uid ?? "");
      setPackages(prev => [pkg, ...prev]);
      logActivity({
        entityType: "Package", entityName: pkg.title, action: "created",
        detail: `Added package ${pkg.refNumber} (${pkg.destination})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create package" };
    }
  }

  async function editPackage(
    id: string, data: Partial<PackageFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updatePackage(id, data);
      setPackages(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      return { error: null };
    } catch {
      return { error: "Failed to update package" };
    }
  }

  async function removePackage(id: string): Promise<{ error: string | null }> {
    try {
      const pkg = packages.find(p => p.id === id);
      await deletePackage(id);
      setPackages(prev => prev.filter(p => p.id !== id));
      if (pkg) {
        logActivity({
          entityType: "Package", entityName: pkg.title, action: "deleted",
          detail: `Deleted package ${pkg.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete package" };
    }
  }

  return { packages, loading, error, load, addPackage, editPackage, removePackage };
}
