"use client";

import { useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import { digestRepository } from "@/modules/digests/services/digest.repository";
import type { WeeklySalesDigest } from "@/modules/digests/types";

export function useLatestWeeklyDigest() {
  const [digest, setDigest] = useState<WeeklySalesDigest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    digestRepository
      .findMany({
        constraints: [
          where("type", "==", "weekly-sales-leaderboard"),
          orderBy("weekOf", "desc"),
        ],
        pageSize: 1,
      })
      .then((results) => { if (!cancelled) setDigest(results[0] ?? null); })
      .catch(() => { if (!cancelled) setDigest(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { digest, loading };
}
