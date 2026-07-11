"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase/client";

type QuotaStat = { count: number; limit: number; pct: number };
type WarningLevel = "ok" | "warning" | "critical";

export type UsageData = {
  firebase: {
    available: boolean;
    reads: QuotaStat; writes: QuotaStat; deletes: QuotaStat;
    warningLevel: WarningLevel;
    error?: string;
  };
  supabase: {
    available: boolean;
    customersSynced: number; bookingsSynced: number; lastSyncedAt: string | null;
    approxRows: number; approxMB: number; limitMB: number; pct: number;
    warningLevel: WarningLevel;
  };
};

export function useUsage() {
  const [data,    setData]    = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/usage", {
        headers: idToken ? { authorization: `Bearer ${idToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load usage data");
      setData(await res.json());
    } catch {
      setError("Couldn't load usage data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, load };
}
