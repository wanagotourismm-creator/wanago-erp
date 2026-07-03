"use client";

import { useState, useEffect } from "react";
import {
  fetchDashboardStats,
  fetchLeadPipeline,
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
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, p, r] = await Promise.all([
        fetchDashboardStats(),
        fetchLeadPipeline(),
        fetchRevenueData(),
      ]);
      setStats(s);
      setPipeline(p);
      setRevenue(r);
      setLoading(false);
    }
    load();
  }, []);

  return { stats, pipeline, revenue, loading };
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
