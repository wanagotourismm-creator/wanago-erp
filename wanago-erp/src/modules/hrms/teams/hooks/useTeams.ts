"use client";

import { useState, useEffect } from "react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import type { Employee } from "@/modules/hrms/shared/types";

export type Team = {
  department: string;
  members: Employee[];
};

export function useTeams() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    fetchEmployees()
      .then((employees) => {
        const active = employees.filter((e) => e.employeeStatus === "active");
        const byDept = new Map<string, Employee[]>();
        for (const e of active) {
          const dept = e.department || "Unassigned";
          const list = byDept.get(dept) ?? [];
          list.push(e);
          byDept.set(dept, list);
        }

        const sorted = Array.from(byDept.entries())
          .map(([department, members]) => ({
            department,
            members: members.sort((a, b) => a.fullName.localeCompare(b.fullName)),
          }))
          .sort((a, b) => b.members.length - a.members.length);

        setTeams(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { loading, teams };
}
