"use client";

import { useState, useEffect, useCallback } from "react";
import { checkSystemHealth, type CollectionHealth } from "@/modules/admin/health/services/health.service";

export function useSystemHealth() {
  const [collections, setCollections] = useState<CollectionHealth[]>([]);
  const [lastActivityAt, setLastActivityAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await checkSystemHealth();
      setCollections(result.collections);
      setLastActivityAt(result.lastActivityAt);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { collections, lastActivityAt, loading, load };
}
