"use client";

import { useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import { founderBriefingRepository } from "@/modules/digests/services/founder-briefing.repository";
import type { FounderBriefingDigest } from "@/modules/digests/types";

export function useLatestFounderBriefing() {
  const [briefing, setBriefing] = useState<FounderBriefingDigest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    founderBriefingRepository
      .findMany({
        constraints: [where("type", "==", "founder-briefing"), orderBy("weekOf", "desc")],
        pageSize: 1,
      })
      .then((results) => { if (!cancelled) setBriefing(results[0] ?? null); })
      .catch(() => { if (!cancelled) setBriefing(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { briefing, loading };
}
