"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchSuspiciousAttempts, markSuspiciousAttemptReviewed, deleteSuspiciousAttempt, reinstateEmployee,
} from "@/modules/hrms/attendance/services/suspicious-attendance.service";
import { fetchUsers } from "@/modules/admin/users/services/user-admin.service";
import { useAuthStore } from "@/store/auth.store";
import { toDate } from "@/lib/utils/helpers";
import type { SuspiciousAttendanceAttempt } from "@/modules/hrms/shared/types";

const ESCALATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ESCALATION_THRESHOLD = 3; // 3rd+ flagged attempt in the window counts as a repeated pattern

export function useSuspiciousAttendance() {
  const [attempts, setAttempts] = useState<SuspiciousAttendanceAttempt[]>([]);
  const [suspendedUserIds, setSuspendedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [reinstating, setReinstating] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Whether a flagged attempt's account is STILL suspended is read live off
  // users/{uid}.isActive rather than trusted from the attempt log itself —
  // the log is a historical record, but the suspension it caused may have
  // already been reinstated (by this page or directly in the Users admin
  // page) since it was written.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedAttempts, users] = await Promise.all([fetchSuspiciousAttempts(), fetchUsers()]);
      setAttempts(fetchedAttempts);
      setSuspendedUserIds(new Set(
        users.filter((u) => !u.isActive && u.suspensionSource === "suspicious_attendance").map((u) => u.id)
      ));
    } catch {
      setError("Failed to load flagged attendance attempts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function reinstate(userId: string) {
    setReinstating(userId);
    try {
      const { error } = await reinstateEmployee(userId);
      if (!error) setSuspendedUserIds((p) => { const next = new Set(p); next.delete(userId); return next; });
      return { error };
    } finally {
      setReinstating(null);
    }
  }

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
  // list, not stored per-attempt at creation time — every log entry is
  // written server-side by /api/hrms/attendance/clock (Admin SDK), which
  // only ever sees one attempt at a time and doesn't itself read this
  // collection back. Recomputing here, on HR's own read-permitted session,
  // is simpler than threading a running per-employee count through the
  // write path.
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
    suspended:  suspendedUserIds.size,
  };

  return {
    attempts, loading, error, stats, escalatedEmployeeIds, suspendedUserIds, reinstating,
    load, markReviewed, removeAttempt, reinstate,
  };
}
