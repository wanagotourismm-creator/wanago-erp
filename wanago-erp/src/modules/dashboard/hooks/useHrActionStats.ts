"use client";

import { useEffect, useState } from "react";
import { fetchLeaves } from "@/modules/hrms/leaves/services/leave.service";
import { fetchRegularizations } from "@/modules/hrms/regularization/services/regularization.service";
import { fetchJobOpenings } from "@/modules/recruitment/jobs/services/job.service";
import { fetchCandidates } from "@/modules/recruitment/candidates/services/candidate.service";
import { toDate } from "@/lib/utils/helpers";
import { RECRUITMENT_STAGES } from "@/lib/constants";

export type PendingItem = { kind: "leave" | "regularization"; id: string; employeeName: string; daysOld: number; detail: string };

export type HrActionStats = {
  pendingLeaves: number;
  pendingRegularizations: number;
  openJobOpenings: number;
  candidatesInPipeline: number;
  hiresThisMonth: number;
  oldestPending: PendingItem[]; // up to 5, oldest first — the actual backlog to clear
};

const EMPTY: HrActionStats = {
  pendingLeaves: 0, pendingRegularizations: 0, openJobOpenings: 0,
  candidatesInPipeline: 0, hiresThisMonth: 0, oldestPending: [],
};

// HR isn't scoped to "my direct reports" the way a manager's Team Inbox is
// — these are company-wide queues HR is responsible for clearing, so
// nothing here is filtered to a single employeeId.
export function useHrActionStats() {
  const [stats, setStats] = useState<HrActionStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [leaves, regularizations, jobOpenings, candidates] = await Promise.all([
          fetchLeaves(), fetchRegularizations(), fetchJobOpenings(), fetchCandidates(),
        ]);
        if (cancelled) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const ageInDays = (d: Date) => Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

        const pendingLeaves = leaves.filter((l) => l.status === "pending");
        const pendingRegs = regularizations.filter((r) => r.regularizationStatus === "pending");

        const pendingItems: PendingItem[] = [
          ...pendingLeaves.map((l): PendingItem | null => {
            const created = toDate(l.createdAt);
            if (!created) return null;
            return { kind: "leave", id: l.id, employeeName: l.employeeName, daysOld: ageInDays(created), detail: `${l.leaveType} leave` };
          }),
          ...pendingRegs.map((r): PendingItem | null => {
            const created = toDate(r.createdAt);
            if (!created) return null;
            return { kind: "regularization", id: r.id, employeeName: r.employeeName, daysOld: ageInDays(created), detail: `Correction for ${r.date}` };
          }),
        ].filter((i): i is PendingItem => i !== null).sort((a, b) => b.daysOld - a.daysOld);

        const hiresThisMonth = candidates.filter((c) => {
          if (c.status !== RECRUITMENT_STAGES.JOINED) return false;
          const updated = toDate(c.updatedAt);
          return updated && updated >= monthStart;
        }).length;

        setStats({
          pendingLeaves: pendingLeaves.length,
          pendingRegularizations: pendingRegs.length,
          openJobOpenings: jobOpenings.filter((j) => j.jobStatus === "open").length,
          candidatesInPipeline: candidates.filter((c) =>
            c.status !== RECRUITMENT_STAGES.JOINED && c.status !== RECRUITMENT_STAGES.REJECTED
          ).length,
          hiresThisMonth,
          oldestPending: pendingItems.slice(0, 5),
        });
      } catch (e) {
        console.error("[useHrActionStats] failed to load — showing zeroed stats:", e);
        if (!cancelled) setStats(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { ...stats, loading };
}
