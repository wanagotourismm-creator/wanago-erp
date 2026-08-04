"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchOperationsBookings, deleteOperationsBooking } from "@/modules/tour-operations/services/tour-operations.service";
import type { OperationsBooking } from "@/modules/tour-operations/types";

export function useTourOperations() {
  const [records, setRecords] = useState<OperationsBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (filters?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await fetchOperationsBookings(filters));
    } catch {
      setError("Failed to load tour operations records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function removeRecord(id: string): Promise<{ error: string | null }> {
    try {
      await deleteOperationsBooking(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to delete record" };
    }
  }

  return { records, loading, error, load, removeRecord };
}
