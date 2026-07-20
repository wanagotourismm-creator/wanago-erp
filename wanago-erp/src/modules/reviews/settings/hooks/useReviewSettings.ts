"use client";

import { useState, useEffect } from "react";
import {
  fetchReviewSettings, updateReviewSettings,
} from "@/modules/reviews/settings/services/review-settings.service";
import { DEFAULT_REVIEW_SETTINGS, type ReviewSettings } from "@/modules/reviews/settings/types";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";

export function useReviewSettings() {
  const [settings, setSettings] = useState<ReviewSettings>(DEFAULT_REVIEW_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchReviewSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function save(data: ReviewSettings): Promise<{ error: string | null }> {
    setSaving(true);
    try {
      await updateReviewSettings(data, user?.uid ?? "");
      setSettings(data);
      logActivity({
        entityType: "Review Settings", entityName: "Review & NPS Engine", action: "updated",
        detail: "Updated the review/NPS delay and thresholds",
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to save review settings" };
    } finally {
      setSaving(false);
    }
  }

  return { settings, loading, saving, save };
}
