"use client";

import { useState, useEffect } from "react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import type { Employee } from "@/modules/hrms/shared/types";

export type OrgNode = {
  employee: Employee;
  children: OrgNode[];
};

export type OrgGroup = {
  department: string;
  roots: OrgNode[];
};

function buildNode(emp: Employee, childrenMap: Map<string, Employee[]>, visited: Set<string>): OrgNode {
  const nextVisited = new Set(visited);
  nextVisited.add(emp.id);

  const kids = (childrenMap.get(emp.id) ?? []).filter((k) => !visited.has(k.id));

  return {
    employee: emp,
    children: kids
      .map((k) => buildNode(k, childrenMap, nextVisited))
      .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)),
  };
}

export function useOrgChart() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<OrgGroup[]>([]);

  useEffect(() => {
    fetchEmployees()
      .then((employees) => {
        const active = employees.filter((e) => e.employeeStatus === "active");
        const byId = new Map(active.map((e) => [e.id, e]));

        const childrenMap = new Map<string, Employee[]>();
        const roots: Employee[] = [];

        for (const e of active) {
          const managerId = e.reportingManagerId;
          const manager = managerId ? byId.get(managerId) : null;

          // No manager set, or manager not found among active employees
          // (e.g. inactive/deleted manager), or a self-referencing record —
          // all of these are treated as roots so nobody is silently dropped.
          if (!manager || manager.id === e.id) {
            roots.push(e);
            continue;
          }
          const list = childrenMap.get(manager.id) ?? [];
          list.push(e);
          childrenMap.set(manager.id, list);
        }

        const rootNodes = roots
          .map((r) => buildNode(r, childrenMap, new Set()))
          .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));

        let result: OrgGroup[];
        if (rootNodes.length <= 1) {
          result = rootNodes.length === 1
            ? [{ department: rootNodes[0].employee.department || "Unassigned", roots: rootNodes }]
            : [];
        } else {
          const byDept = new Map<string, OrgNode[]>();
          for (const node of rootNodes) {
            const dept = node.employee.department || "Unassigned";
            const list = byDept.get(dept) ?? [];
            list.push(node);
            byDept.set(dept, list);
          }
          result = Array.from(byDept.entries())
            .map(([department, deptRoots]) => ({ department, roots: deptRoots }))
            .sort((a, b) => b.roots.length - a.roots.length);
        }

        setGroups(result);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { loading, groups, showGroupHeaders: groups.length > 1 };
}
