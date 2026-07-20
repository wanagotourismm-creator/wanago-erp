"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchJourneys, createJourney, updateJourney, deleteJourney,
} from "@/modules/journeys/services/journey.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Journey, JourneyFormData } from "@/modules/journeys/types";

export function useJourneys() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJourneys(await fetchJourneys());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addJourney(data: JourneyFormData): Promise<{ error: string | null }> {
    try {
      const journey = await createJourney(data, user?.uid ?? "");
      setJourneys(prev => [...prev, journey]);
      logActivity({
        entityType: "Journey", entityName: journey.name, action: "created",
        detail: `Created journey "${journey.name}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create journey" };
    }
  }

  async function editJourney(id: string, data: Partial<JourneyFormData>): Promise<{ error: string | null }> {
    try {
      await updateJourney(id, data);
      setJourneys(prev => prev.map(j => j.id === id ? { ...j, ...data } : j));
      logActivity({
        entityType: "Journey", entityName: data.name ?? id, action: "updated",
        detail: `Updated journey "${data.name ?? id}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to update journey" };
    }
  }

  async function removeJourney(journey: Journey): Promise<{ error: string | null }> {
    try {
      await deleteJourney(journey.id);
      setJourneys(prev => prev.filter(j => j.id !== journey.id));
      logActivity({
        entityType: "Journey", entityName: journey.name, action: "deleted",
        detail: `Deleted journey "${journey.name}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to delete journey" };
    }
  }

  return { journeys, loading, addJourney, editJourney, removeJourney };
}
