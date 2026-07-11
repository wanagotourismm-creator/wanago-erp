"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchItineraryBrochures, createItineraryBrochure, updateItineraryBrochure,
  deleteItineraryBrochure, duplicateItineraryBrochure, generateBrochurePdf,
} from "@/modules/itinerary-brochures/services/itinerary-brochure.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { ItineraryBrochure, ItineraryBrochureFormData } from "@/modules/itinerary-brochures/types";

export function useItineraryBrochures() {
  const [brochures, setBrochures] = useState<ItineraryBrochure[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchItineraryBrochures();
      setBrochures(data);
    } catch {
      setError("Failed to load itinerary brochures");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addBrochure(data: ItineraryBrochureFormData): Promise<{ error: string | null }> {
    try {
      const brochure = await createItineraryBrochure(data, user?.uid ?? "");
      setBrochures(prev => [brochure, ...prev]);
      logActivity({
        entityType: "ItineraryBrochure", entityName: brochure.destination, action: "created",
        detail: `Added itinerary brochure ${brochure.refNumber} (${brochure.destination})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create itinerary brochure" };
    }
  }

  async function editBrochure(
    id: string, data: Partial<ItineraryBrochureFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateItineraryBrochure(id, data);
      setBrochures(prev => prev.map(b => b.id === id ? { ...b, ...data, pdfUrl: null, pdfGeneratedAt: null } : b));
      return { error: null };
    } catch {
      return { error: "Failed to update itinerary brochure" };
    }
  }

  async function removeBrochure(id: string): Promise<{ error: string | null }> {
    try {
      const brochure = brochures.find(b => b.id === id);
      await deleteItineraryBrochure(id);
      setBrochures(prev => prev.filter(b => b.id !== id));
      if (brochure) {
        logActivity({
          entityType: "ItineraryBrochure", entityName: brochure.destination, action: "deleted",
          detail: `Deleted itinerary brochure ${brochure.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete itinerary brochure" };
    }
  }

  async function cloneBrochure(source: ItineraryBrochure): Promise<{ error: string | null }> {
    try {
      const brochure = await duplicateItineraryBrochure(source, user?.uid ?? "");
      setBrochures(prev => [brochure, ...prev]);
      logActivity({
        entityType: "ItineraryBrochure", entityName: brochure.destination, action: "created",
        detail: `Duplicated itinerary brochure ${source.refNumber} into ${brochure.refNumber}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to duplicate itinerary brochure" };
    }
  }

  async function generatePdf(id: string): Promise<{ pdfUrl: string | null; error: string | null }> {
    try {
      const pdfUrl = await generateBrochurePdf(id);
      setBrochures(prev => prev.map(b => b.id === id ? { ...b, pdfUrl, pdfGeneratedAt: new Date().toISOString() } : b));
      return { pdfUrl, error: null };
    } catch {
      return { pdfUrl: null, error: "Failed to generate PDF" };
    }
  }

  return { brochures, loading, error, load, addBrochure, editBrochure, removeBrochure, cloneBrochure, generatePdf };
}
