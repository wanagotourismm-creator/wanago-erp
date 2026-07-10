"use client";

import { useEffect, useState } from "react";
import { fetchGoals, fetchObjectivesByGoal } from "@/modules/goals/services/goal.service";
import type { Objective } from "@/modules/goals/types";

export type RelevantObjective = Objective & { goalTitle: string };

// Shows the individual employee the slice of the company's active OKRs that
// actually involves them — either their own department's objectives, or
// ones they personally own — instead of the full admin-facing goals list.
// No dedicated "objectives across all goals" fetch exists yet, so this
// fetches each active goal's objectives in parallel (fine at the scale of
// a handful of active company goals) and filters client-side.
export function useRelevantCompanyGoals(department: string | null, employeeId: string | null) {
  const [objectives, setObjectives] = useState<RelevantObjective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const goals = await fetchGoals();
        const activeGoals = goals.filter((g) => g.goalStatus === "active");
        const perGoal = await Promise.all(
          activeGoals.map(async (g) => {
            const objs = await fetchObjectivesByGoal(g.id);
            return objs.map((o): RelevantObjective => ({ ...o, goalTitle: g.title }));
          })
        );
        if (cancelled) return;

        const all = perGoal.flat();
        const deptLower = department?.toLowerCase() ?? null;
        const relevant = all.filter((o) =>
          o.ownerId === employeeId ||
          (deptLower && o.department?.toLowerCase() === deptLower)
        );
        setObjectives(relevant);
      } catch (e) {
        console.error("[useRelevantCompanyGoals] failed to load — showing none:", e);
        if (!cancelled) setObjectives([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [department, employeeId]);

  return { objectives, loading };
}
