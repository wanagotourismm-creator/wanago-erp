"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchResources, createResource, updateResource, deleteResource,
} from "@/modules/resources/services/resource.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Resource, ResourceFormData } from "@/modules/resources/types";

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResources(await fetchResources());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addResource(data: ResourceFormData): Promise<{ error: string | null }> {
    try {
      const resource = await createResource(data, user?.uid ?? "");
      setResources(prev => [...prev, resource]);
      logActivity({
        entityType: "Resource", entityName: resource.name, action: "created",
        detail: `Added resource "${resource.name}" (${resource.type})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to add resource" };
    }
  }

  async function editResource(id: string, data: Partial<ResourceFormData>): Promise<{ error: string | null }> {
    try {
      await updateResource(id, data);
      setResources(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      logActivity({
        entityType: "Resource", entityName: data.name ?? id, action: "updated",
        detail: `Updated resource "${data.name ?? id}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to update resource" };
    }
  }

  async function removeResource(resource: Resource): Promise<{ error: string | null }> {
    try {
      await deleteResource(resource.id);
      setResources(prev => prev.filter(r => r.id !== resource.id));
      logActivity({
        entityType: "Resource", entityName: resource.name, action: "deleted",
        detail: `Deleted resource "${resource.name}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to delete resource" };
    }
  }

  return { resources, loading, addResource, editResource, removeResource, reload: load };
}
