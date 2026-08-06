"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { orderBy, collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { aiUsageLogRepository } from "@/modules/ai-core/services/ai-usage-log.repository";
import { aiActionLogRepository } from "@/modules/ai-core/services/ai-action-log.repository";
import { toDate } from "@/lib/utils/helpers";
import type { AiUsageLog, AiActionLog } from "@/modules/ai-core/types";

// Sampling a recent window rather than the full collections — these grow
// unbounded (one row per model call/AI write), and this dashboard is a
// monitoring surface, not a report generator. Good enough to show "what's
// the AI been doing lately" without paying for a full-collection scan.
const USAGE_LOG_SAMPLE = 300;
const ACTION_LOG_SAMPLE = 100;
const WINDOW_DAYS = 30;

export type FeatureBreakdown = { feature: string; success: number; error: number; total: number };

function withinWindow(value: AiUsageLog["createdAt"] | AiActionLog["createdAt"], windowStart: Date): boolean {
  const d = toDate(value);
  return d !== null && d >= windowStart;
}

export function useAiEmployeeDashboard() {
  const [usageLogs, setUsageLogs] = useState<AiUsageLog[]>([]);
  const [actionLogs, setActionLogs] = useState<AiActionLog[]>([]);
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usage, actions, knowledgeSnap] = await Promise.all([
        aiUsageLogRepository.findMany({ constraints: [orderBy("createdAt", "desc")], pageSize: USAGE_LOG_SAMPLE }),
        aiActionLogRepository.findMany({ constraints: [orderBy("createdAt", "desc")], pageSize: ACTION_LOG_SAMPLE }),
        getCountFromServer(collection(db, FIRESTORE_COLLECTIONS.RESOLVED_TICKET_KNOWLEDGE)),
      ]);
      setUsageLogs(usage);
      setActionLogs(actions);
      setKnowledgeCount(knowledgeSnap.data().count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const windowStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - WINDOW_DAYS);
    return d;
  }, []);

  const recentUsage = useMemo(
    () => usageLogs.filter((l) => withinWindow(l.createdAt, windowStart)),
    [usageLogs, windowStart]
  );

  const stats = useMemo(() => {
    const total = recentUsage.length;
    const successes = recentUsage.filter((l) => l.outcome === "success").length;
    return {
      totalCalls:   total,
      successRate:  total > 0 ? Math.round((successes / total) * 100) : null,
      actionsTaken: actionLogs.filter((l) => withinWindow(l.createdAt, windowStart)).length,
    };
  }, [recentUsage, actionLogs, windowStart]);

  // Top features by call volume in-window, each split into success/error —
  // status colors (not categorical hues) since success/error is a state,
  // not an identity.
  const featureBreakdown = useMemo<FeatureBreakdown[]>(() => {
    const map = new Map<string, { success: number; error: number }>();
    for (const l of recentUsage) {
      const entry = map.get(l.feature) ?? { success: 0, error: 0 };
      if (l.outcome === "success") entry.success += 1; else entry.error += 1;
      map.set(l.feature, entry);
    }
    return Array.from(map.entries())
      .map(([feature, v]) => ({ feature, ...v, total: v.success + v.error }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [recentUsage]);

  // Already createdAt-desc from the query, so filtering preserves recency.
  const recentErrors = useMemo(() => usageLogs.filter((l) => l.outcome === "error").slice(0, 10), [usageLogs]);
  const recentActions = useMemo(() => actionLogs.slice(0, 15), [actionLogs]);

  return { loading, stats, featureBreakdown, recentErrors, recentActions, knowledgeCount, reload: load };
}
