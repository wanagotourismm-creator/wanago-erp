"use client";

import { useState, useEffect } from "react";
import {
  fetchCompanySettings, updateCompanySettings,
  DEFAULT_COMPANY_SETTINGS, type CompanySettings,
} from "@/modules/admin/settings/services/company-settings.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchCompanySettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function save(data: CompanySettings): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await updateCompanySettings(data, user?.uid ?? "");
      setSettings(data);
      logActivity({
        entityType: "Company Settings", entityName: data.businessName, action: "updated",
        detail: "Updated company settings",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save settings" };
    } finally {
      setSaving(false);
    }
  }

  return { settings, loading, saving, save };
}
