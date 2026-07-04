"use client";

import { useState, useEffect } from "react";
import {
  fetchRolePermissions, saveRolePermissions,
} from "@/modules/admin/permissions/services/permissions.service";
import { setPermissionOverrides } from "@/lib/rbac";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { PermissionMap } from "@/types/rbac";

export function useRolePermissions() {
  const [map,     setMap]     = useState<PermissionMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchRolePermissions()
      .then(setMap)
      .finally(() => setLoading(false));
  }, []);

  async function save(newMap: PermissionMap): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await saveRolePermissions(newMap, user?.uid ?? "");
      setMap(newMap);
      setPermissionOverrides(newMap);
      logActivity({
        entityType: "Permissions", entityName: "Role Permissions", action: "updated",
        detail: "Updated role permission assignments",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save permissions" };
    } finally {
      setSaving(false);
    }
  }

  return { map, loading, saving, save };
}
