"use client";

import { useState, useEffect } from "react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";

export type DeptCount = { department: string; count: number; color: string };

const DONUT_COLORS = ["#228050", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

export function useEmployeeBreakdown() {
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<DeptCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees()
      .then((employees) => {
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
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { loading, total, departments };
}
