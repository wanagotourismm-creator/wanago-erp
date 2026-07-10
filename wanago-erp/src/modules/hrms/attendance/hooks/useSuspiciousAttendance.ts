"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchSuspiciousAttempts, markSuspiciousAttemptReviewed, deleteSuspiciousAttempt,
} from "@/modules/hrms/attendance/services/suspicious-attendance.service";
import { useAuthStore } from "@/store/auth.store";
import type { SuspiciousAttendanceAttempt } from "@/modules/hrms/shared/types";

export function useSuspiciousAttendance() {
  const [attempts, setAttempts] = useState<SuspiciousAttendanceAttempt[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAttempts(await fetchSuspiciousAttempts());
    } catch {
      setError("Failed to load flagged attendance attempts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markReviewed(id: string) {
    try {
      await markSuspiciousAttemptReviewed(id, user?.uid ?? "");
      setAttempts(p => p.map(a => a.id === id ? { ...a, reviewed: true, reviewedBy: user?.uid ?? "" } : a));
      return { error: null };
    } catch {
      return { error: "Failed to mark as reviewed" };
    }
  }

  async function removeAttempt(id: string) {
    try {
      await deleteSuspiciousAttempt(id);
      setAttempts(p => p.filter(a => a.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to delete flagged attempt" };
    }
  }

  const stats = {
    total:      attempts.length,
    unreviewed: attempts.filter(a => !a.reviewed).length,
  };

  return { attempts, loading, error, stats, load, markReviewed, removeAttempt };
}
