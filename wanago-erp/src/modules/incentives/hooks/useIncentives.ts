"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchIncentiveSettings } from "@/modules/incentives/settings/services/incentive-settings.service";
import { computeAgentIncentiveSummaries } from "@/modules/incentives/lib/calculateIncentives";
import type { AgentIncentiveSummary } from "@/modules/incentives/types";

export function useIncentives() {
  const [summaries, setSummaries] = useState<AgentIncentiveSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookings, leads, employees, settings] = await Promise.all([
        fetchBookings({ status: "confirmed" }),
        fetchLeads(),
        fetchEmployees(),
        fetchIncentiveSettings(),
      ]);

      const leadsById     = new Map(leads.map((l) => [l.id, l]));
      const employeesById = new Map(employees.map((e) => [e.id, e]));

      const list = computeAgentIncentiveSummaries(bookings, leadsById, employeesById, settings);
      setSummaries(list);
    } catch {
      setError("Failed to load incentives");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { summaries, loading, error, reload: load };
}
