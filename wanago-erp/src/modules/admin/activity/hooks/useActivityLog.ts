"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchRecentActivity, type ActivityLogEntry } from "@/lib/activity-log";

export function useActivityLog() {
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecentActivity();
      setActivity(data);
    } catch {
      setError("Failed to load activity log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { activity, loading, error, load };
}
