"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchItineraries, createItinerary, updateItinerary, deleteItinerary,
} from "@/modules/itineraries/services/itinerary.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Itinerary, ItineraryFormData } from "@/modules/itineraries/types";

export function useItineraries() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading,      setLoading]    = useState(true);
  const [error,        setError]      = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchItineraries();
      setItineraries(data);
    } catch {
      setError("Failed to load itineraries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addItinerary(data: ItineraryFormData): Promise<{ error: string | null }> {
    try {
      const itinerary = await createItinerary(data, user?.uid ?? "");
      setItineraries(prev => [itinerary, ...prev]);
      logActivity({
        entityType: "Itinerary", entityName: itinerary.title, action: "created",
        detail: `Added itinerary ${itinerary.refNumber} (${itinerary.destination})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create itinerary" };
    }
  }

  async function editItinerary(
    id: string, data: Partial<ItineraryFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateItinerary(id, data);
      setItineraries(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
      return { error: null };
    } catch {
      return { error: "Failed to update itinerary" };
    }
  }

  async function removeItinerary(id: string): Promise<{ error: string | null }> {
    try {
      const itinerary = itineraries.find(i => i.id === id);
      await deleteItinerary(id);
      setItineraries(prev => prev.filter(i => i.id !== id));
      if (itinerary) {
        logActivity({
          entityType: "Itinerary", entityName: itinerary.title, action: "deleted",
          detail: `Deleted itinerary ${itinerary.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete itinerary" };
    }
  }

  return { itineraries, loading, error, load, addItinerary, editItinerary, removeItinerary };
}
