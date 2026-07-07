"use client";

import { useState, useEffect } from "react";
import {
  fetchIncentiveSettings, updateIncentiveSettings,
  DEFAULT_INCENTIVE_SETTINGS,
} from "@/modules/incentives/settings/services/incentive-settings.service";
import type { IncentiveSettings } from "@/modules/incentives/settings/types";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";

export function useIncentiveSettings() {
  const [settings, setSettings] = useState<IncentiveSettings>(DEFAULT_INCENTIVE_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchIncentiveSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function save(data: IncentiveSettings): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await updateIncentiveSettings(data, user?.uid ?? "");
      setSettings(data);
      logActivity({
        entityType: "Incentive Settings", entityName: "Sales Incentive Structure", action: "updated",
        detail: "Updated the sales incentive structure",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save incentive settings" };
    } finally {
      setSaving(false);
    }
  }

  return { settings, loading, saving, save };
}
