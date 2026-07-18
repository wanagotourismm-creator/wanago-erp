"use client";

import { useState, useEffect } from "react";
import {
  fetchSecuritySettings, updateSecuritySettings, DEFAULT_SECURITY_SETTINGS, type SecuritySettings,
} from "@/modules/security/services/security-settings.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";

export function useSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchSecuritySettings().then(setSettings).finally(() => setLoading(false));
  }, []);

  async function save(data: SecuritySettings): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await updateSecuritySettings(data, user?.uid ?? "");
      setSettings(data);
      logActivity({
        entityType: "Security", entityName: "Security Settings", action: "updated",
        detail: "Updated the delete confirmation PIN",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save security settings" };
    } finally {
      setSaving(false);
    }
  }

  return { settings, loading, saving, save };
}
