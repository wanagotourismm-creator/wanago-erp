"use client";

import { useState, useEffect } from "react";
import type { Employee } from "@/modules/hrms/shared/types";

export type DeptCount = { department: string; count: number; color: string };

const DONUT_COLORS = ["#228050", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

// Takes the Employees list from useDashboardEmployees() (shared with
// usePayoutSummary) instead of fetching its own copy of the same
// full-collection data.
export function useEmployeeBreakdown(employees: Employee[] | null, employeesLoading: boolean) {
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<DeptCount[]>([]);

  useEffect(() => {
    if (!employees) return;
    const active = employees.filter((e) => e.employeeStatus === "active");
    const byDept = new Map<string, number>();
    for (const e of active) {
      const dept = e.department || "Unassigned";
      byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
    }
    const sorted = Array.from(byDept.entries())
      .map(([department, count], i) => ({ department, count, color: DONUT_COLORS[i % DONUT_COLORS.length] }))
      .sort((a, b) => b.count - a.count);

    setTotal(active.length);
    setDepartments(sorted);
  }, [employees]);

  return { loading: employeesLoading, total, departments };
}
