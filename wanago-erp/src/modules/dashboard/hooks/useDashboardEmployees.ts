"use client";

import { useState, useEffect } from "react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import type { Employee } from "@/modules/hrms/shared/types";

// Fetched once here and shared by useEmployeeBreakdown + usePayoutSummary
// (via DashboardPage) instead of each independently fetching the full
// Employees collection on the same dashboard render.
export function useDashboardEmployees() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetchEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, []);

  return { employees, loading };
}
