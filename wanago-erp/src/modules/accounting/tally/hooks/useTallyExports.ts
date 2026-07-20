"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchTallyExports } from "@/modules/accounting/tally/services/tally-export.service";
import type { TallyExportLog } from "@/modules/accounting/tally/types";

export function useTallyExports() {
  const [exports, setExports] = useState<TallyExportLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setExports(await fetchTallyExports());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { exports, loading, reload: load };
}
