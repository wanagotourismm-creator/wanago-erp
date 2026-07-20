"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchSegments, createSegment, updateSegment, deleteSegment,
} from "@/modules/journeys/services/segment.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Segment, SegmentFormData } from "@/modules/journeys/types";

export function useSegments() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSegments(await fetchSegments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addSegment(data: SegmentFormData): Promise<{ error: string | null }> {
    try {
      const segment = await createSegment(data, user?.uid ?? "");
      setSegments(prev => [...prev, segment]);
      logActivity({
        entityType: "Segment", entityName: segment.name, action: "created",
        detail: `Created segment "${segment.name}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create segment" };
    }
  }

  async function editSegment(id: string, data: Partial<SegmentFormData>): Promise<{ error: string | null }> {
    try {
      await updateSegment(id, data);
      setSegments(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
      logActivity({
        entityType: "Segment", entityName: data.name ?? id, action: "updated",
        detail: `Updated segment "${data.name ?? id}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to update segment" };
    }
  }

  async function removeSegment(segment: Segment): Promise<{ error: string | null }> {
    try {
      await deleteSegment(segment.id);
      setSegments(prev => prev.filter(s => s.id !== segment.id));
      logActivity({
        entityType: "Segment", entityName: segment.name, action: "deleted",
        detail: `Deleted segment "${segment.name}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to delete segment" };
    }
  }

  return { segments, loading, addSegment, editSegment, removeSegment };
}
