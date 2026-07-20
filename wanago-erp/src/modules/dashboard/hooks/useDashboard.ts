"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { DocumentData } from "firebase/firestore";
import {
  fetchDashboardRawData,
  computeDashboardStats,
  computeLeadPipeline,
  computeCockpitStats,
  computeCockpitAlerts,
  fetchRevenueData,
} from "@/modules/dashboard/services/dashboard.service";
import type {
  DashboardStats,
  LeadPipelineItem,
  RevenueDataPoint,
  CockpitAlert,
  CockpitFilters,
} from "@/modules/dashboard/types";

// Auto-refresh interval for the company-wide (admin/super_admin) cockpit
// view — the PRD asks for auto-refresh but a full-collection re-fetch on
// every tick would be wasteful, so this only fires while the tab is visible.
const AUTO_REFRESH_MS = 5 * 60 * 1000;

export function useDashboard(explicitFilters?: CockpitFilters) {
  // Computed fresh (not a module-level constant) so "now" doesn't freeze
  // at whenever this module first loaded.
  const defaultFilters = useMemo<CockpitFilters>(() => ({
    officeId:   "all",
    rangeStart: new Date(new Date().setDate(new Date().getDate() - 30)),
    rangeEnd:   new Date(),
  }), []);
  const filters = explicitFilters ?? defaultFilters;

  const [stats,    setStats]    = useState<DashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<LeadPipelineItem[]>([]);
  const [revenue,  setRevenue]  = useState<RevenueDataPoint[]>([]);
  const [alerts,   setAlerts]   = useState<CockpitAlert[]>([]);
  // Raw Bookings, fetched once here and shared with TopPerformers (via
  // DashboardPage) instead of it doing its own second full-collection read.
  const [bookings, setBookings] = useState<DocumentData[] | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const rawRef = useRef<Awaited<ReturnType<typeof fetchDashboardRawData>> | null>(null);
  // Only the first load shows the full-page skeleton — a background
  // auto-refresh tick shouldn't yank the whole dashboard away every 5 min.
  const hasLoadedOnceRef = useRef(false);
  // Read inside recompute() instead of closed over, so recompute/load can
  // keep stable identities (no needless refetch-on-filter-change loop)
  // while still always seeing the latest filters on auto-refresh.
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const recompute = useCallback((raw: NonNullable<typeof rawRef.current>) => {
    const f = filtersRef.current;
    setStats({
      ...computeDashboardStats(raw.leads, raw.bookings, raw.invoices),
      ...computeCockpitStats(raw, f),
    });
    setPipeline(computeLeadPipeline(raw.leads));
    setAlerts(computeCockpitAlerts(raw.invoices, raw.bookings));
    setBookings(raw.bookings);
  }, []);

  const load = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    setError(null);
    try {
      const [raw, r] = await Promise.all([
        fetchDashboardRawData(),
        fetchRevenueData(),
      ]);
      rawRef.current = raw;
      recompute(raw);
      setRevenue(r);
    } catch (err) {
      // The service functions already catch their own Firestore errors and
      // fall back to zeroed data (so the page still renders) — this only
      // fires for something unexpected outside that, e.g. Promise.all
      // itself throwing. Surfaced so the page can warn the numbers below
      // may not be trustworthy instead of presenting zeros as real data.
      console.error("[useDashboard] failed to load dashboard data:", err);
      setError("Some dashboard data may be incomplete. Try refreshing.");
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, [recompute]);

  useEffect(() => {
    load();
  }, [load]);

  // Filters changed but raw data hasn't — recompute from the cached fetch
  // instead of re-hitting Firestore.
  const rangeStartMs = filters.rangeStart.getTime();
  const rangeEndMs = filters.rangeEnd.getTime();
  useEffect(() => {
    if (rawRef.current) recompute(rawRef.current);
  }, [filters.officeId, rangeStartMs, rangeEndMs, recompute]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { stats, pipeline, revenue, bookings, alerts, loading, error, refresh: load };
}

// ── Live clock hook ───────────────────────────────────────────
export function useClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour:   "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}
