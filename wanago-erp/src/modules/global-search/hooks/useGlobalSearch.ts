"use client";

import { useCallback, useState } from "react";
import { buildSearchIndex } from "@/modules/global-search/services/search-index.service";
import type { SearchResult } from "@/modules/global-search/types";

const CACHE_TTL_MS = 3 * 60_000;

// Module-level (not component state) so the index survives the palette
// being closed/reopened — only the first open of a session (or one past
// the TTL) pays the cost of fetching all 6 collections.
let cache: { data: SearchResult[]; expires: number } | null = null;

export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>(cache?.data ?? []);
  const [loading, setLoading] = useState(false);

  const ensureIndex = useCallback(async (force = false) => {
    if (!force && cache && cache.expires > Date.now()) {
      setResults(cache.data);
      return;
    }
    setLoading(true);
    try {
      const data = await buildSearchIndex();
      cache = { data, expires: Date.now() + CACHE_TTL_MS };
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => ensureIndex(true), [ensureIndex]);

  return { results, loading, ensureIndex, refresh };
}
