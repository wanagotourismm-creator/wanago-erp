"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchSuspiciousAttempts, markSuspiciousAttemptReviewed, deleteSuspiciousAttempt,
} from "@/modules/hrms/attendance/services/suspicious-attendance.service";
import { useAuthStore } from "@/store/auth.store";
import { toDate } from "@/lib/utils/helpers";
import type { SuspiciousAttendanceAttempt } from "@/modules/hrms/shared/types";

const ESCALATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ESCALATION_THRESHOLD = 3; // 3rd+ flagged attempt in the window counts as a repeated pattern

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

  // Repeat-offender detection is computed here from the already-fetched
  // list, not stored per-attempt at creation time — the flagged employee's
  // own client is what writes each log entry (see logSuspiciousAttempt),
  // and it can't read past attempts (only HR/Admin can), so there's no way
  // for it to know its own history. Recomputing here, on HR's own
  // read-permitted session, sidesteps that entirely.
  const escalatedEmployeeIds = useMemo(() => {
    const now = Date.now();
    const countByEmployee = new Map<string, number>();
    for (const a of attempts) {
      const created = toDate(a.createdAt);
      if (!created || now - created.getTime() > ESCALATION_WINDOW_MS) continue;
      countByEmployee.set(a.employeeId, (countByEmployee.get(a.employeeId) ?? 0) + 1);
    }
    return new Set(
      Array.from(countByEmployee.entries())
        .filter(([, count]) => count >= ESCALATION_THRESHOLD)
        .map(([employeeId]) => employeeId)
    );
  }, [attempts]);

  const stats = {
    total:      attempts.length,
    unreviewed: attempts.filter(a => !a.reviewed).length,
    escalated:  escalatedEmployeeIds.size,
  };

  return { attempts, loading, error, stats, escalatedEmployeeIds, load, markReviewed, removeAttempt };
}
