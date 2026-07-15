"use client";

import { useCallback, useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import { predictionRepository } from "@/modules/predictions/services/prediction.repository";
import type { AiPredictionsReport } from "@/modules/predictions/types";

export function useLatestPredictions() {
  const [predictions, setPredictions] = useState<AiPredictionsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return predictionRepository
      .findMany({
        constraints: [where("type", "==", "weekly-ml-predictions"), orderBy("weekOf", "desc")],
        pageSize: 1,
      })
      .then((results) => setPredictions(results[0] ?? null))
      .catch(() => setPredictions(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { predictions, loading, reload };
}
