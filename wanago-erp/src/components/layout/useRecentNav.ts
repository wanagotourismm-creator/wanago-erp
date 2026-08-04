"use client";

import { useCallback, useEffect, useState } from "react";

export type RecentNavEntry = {
  href:  string;
  label: string;
  icon:  string;
};

const STORAGE_KEY = "wanago:recent-nav";
const MAX_ENTRIES = 6;

function readStored(): RecentNavEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentNavEntry[]) : [];
  } catch {
    return [];
  }
}

// Tracks the last few destinations picked from the mobile Menu sheet, so
// staff who use the same 2-3 buried pages daily (e.g. Vendor Rates,
// Expenses) don't have to re-open the same group every time. Per-device
// (localStorage), not per-account — deliberately simple, no Firestore write.
export function useRecentNav() {
  const [recents, setRecents] = useState<RecentNavEntry[]>([]);

  useEffect(() => {
    setRecents(readStored());
  }, []);

  const recordVisit = useCallback((entry: RecentNavEntry) => {
    setRecents((prev) => {
      const next = [entry, ...prev.filter((r) => r.href !== entry.href)].slice(0, MAX_ENTRIES);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable (private mode / quota) — recents just won't persist.
      }
      return next;
    });
  }, []);

  return { recents, recordVisit };
}
