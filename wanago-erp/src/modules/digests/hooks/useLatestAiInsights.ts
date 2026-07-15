"use client";

import { useCallback, useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import { aiInsightsRepository } from "@/modules/digests/services/ai-insights.repository";
import type { AiInsightsReport } from "@/modules/digests/types";

export function useLatestAiInsights() {
  const [report, setReport] = useState<AiInsightsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return aiInsightsRepository
      .findMany({
        constraints: [where("type", "==", "ai-insights-report"), orderBy("weekOf", "desc")],
        pageSize: 1,
      })
      .then((results) => setReport(results[0] ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { report, loading, reload };
}
