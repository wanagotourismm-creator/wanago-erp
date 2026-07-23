"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchResourceAssignments, createResourceAssignment, deleteResourceAssignment,
} from "@/modules/resources/services/resource.service";
import { findConflicts, type ResourceConflict } from "@/modules/resources/services/conflict.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { ResourceAssignment, ResourceAssignmentFormData, ResourceBlackout } from "@/modules/resources/types";

export function useResourceAssignments() {
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssignments(await fetchResourceAssignments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Runs the hard conflict check before ever writing — returns the
  // conflicts instead of saving if any exist, so the caller can show
  // exactly what's in the way rather than a generic failure.
  async function addAssignment(
    data: ResourceAssignmentFormData, blackouts: ResourceBlackout[]
  ): Promise<{ error: string | null; conflicts?: ResourceConflict[] }> {
    const conflicts = findConflicts(data.resourceId, data, assignments, blackouts);
    if (conflicts.length > 0) return { error: "This resource is already booked in that window.", conflicts };

    try {
      const assignment = await createResourceAssignment(data, user?.uid ?? "");
      setAssignments(prev => [...prev, assignment]);
      logActivity({
        entityType: "Resource Assignment", entityName: assignment.resourceName, action: "created",
        detail: `Assigned "${assignment.resourceName}" to booking ${assignment.bookingRefNumber}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create assignment" };
    }
  }

  async function removeAssignment(assignment: ResourceAssignment): Promise<{ error: string | null }> {
    try {
      await deleteResourceAssignment(assignment.id);
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
      logActivity({
        entityType: "Resource Assignment", entityName: assignment.resourceName, action: "deleted",
        detail: `Removed "${assignment.resourceName}" from booking ${assignment.bookingRefNumber}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to remove assignment" };
    }
  }

  return { assignments, loading, addAssignment, removeAssignment, reload: load };
}
