"use client";

import { useState, useEffect, useCallback } from "react";
import { computeReferralAnalytics, type ReferralAnalytics } from "@/modules/referrals/services/referral-analytics.service";

export function useReferralAnalytics() {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAnalytics(await computeReferralAnalytics());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { analytics, loading, reload: load };
}
