"use client";

import { useState, useEffect } from "react";
import type { DocumentData } from "firebase/firestore";
import {
  fetchDashboardRawData,
  computeDashboardStats,
  computeLeadPipeline,
  fetchRevenueData,
} from "@/modules/dashboard/services/dashboard.service";
import type {
  DashboardStats,
  LeadPipelineItem,
  RevenueDataPoint,
} from "@/modules/dashboard/types";

export function useDashboard() {
  const [stats,    setStats]    = useState<DashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<LeadPipelineItem[]>([]);
  const [revenue,  setRevenue]  = useState<RevenueDataPoint[]>([]);
  // Raw Bookings, fetched once here and shared with TopPerformers (via
  // DashboardPage) instead of it doing its own second full-collection read.
  const [bookings, setBookings] = useState<DocumentData[] | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [raw, r] = await Promise.all([
          fetchDashboardRawData(),
          fetchRevenueData(),
        ]);
        setStats(computeDashboardStats(raw.leads, raw.bookings, raw.invoices));
        setPipeline(computeLeadPipeline(raw.leads));
        setBookings(raw.bookings);
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
        setLoading(false);
      }
    }
    load();
  }, []);

  return { stats, pipeline, revenue, bookings, loading, error };
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
