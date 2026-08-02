"use client";

import { useState, useEffect } from "react";
import {
  fetchAiSettings, updateAiSettings, DEFAULT_AI_SETTINGS,
} from "@/modules/ai-core/services/ai-settings.service";
import type { AiSettings } from "@/modules/ai-core/types";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";

export function useAiEmployeeSettings() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchAiSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function save(data: AiSettings): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await updateAiSettings(data, user?.uid ?? "");
      setSettings(data);
      logActivity({
        entityType: "AI Employee Settings", entityName: "AI Assistant", action: "updated",
        detail: data.aiEmployeeEnabled !== settings.aiEmployeeEnabled
          ? `${data.aiEmployeeEnabled ? "Enabled" : "Disabled"} the AI Assistant`
          : "Updated AI Assistant settings",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save AI Assistant settings" };
    } finally {
      setSaving(false);
    }
  }

  return { settings, loading, saving, save };
}
