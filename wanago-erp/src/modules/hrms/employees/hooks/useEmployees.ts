"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchEmployees, createEmployee, updateEmployee, deleteEmployee,
} from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Employee } from "@/modules/hrms/shared/types";
import type { EmployeeFormData } from "@/modules/hrms/employees/types";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addEmployee(data: EmployeeFormData): Promise<{ error: string | null; employee?: Employee }> {
    try {
      const employee = await createEmployee(data, user?.uid ?? "");
      setEmployees(prev => [...prev, employee].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      logActivity({
        entityType: "Employee", entityName: employee.fullName, action: "created",
        detail: `Added employee ${employee.employeeCode} (${employee.designation})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null, employee };
    } catch {
      return { error: "Failed to create employee" };
    }
  }

  async function editEmployee(
    id: string, data: Partial<EmployeeFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateEmployee(id, data);
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
      const target = employees.find(e => e.id === id);
      if (target && data.employeeStatus && data.employeeStatus !== target.employeeStatus) {
        logActivity({
          entityType: "Employee", entityName: target.fullName, action: "status_changed",
          detail: `${target.employeeCode} status changed to ${data.employeeStatus}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      } else if (target) {
        logActivity({
          entityType: "Employee", entityName: target.fullName, action: "updated",
          detail: `Updated employee ${target.employeeCode}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to update employee" };
    }
  }

  async function removeEmployee(id: string): Promise<{ error: string | null }> {
    try {
      const target = employees.find(e => e.id === id);
      await deleteEmployee(id, target?.userId);
      setEmployees(prev => prev.filter(e => e.id !== id));
      if (target) {
        logActivity({
          entityType: "Employee", entityName: target.fullName, action: "deleted",
          detail: `Deleted employee ${target.employeeCode}${target.userId ? " (login account removed too)" : ""}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete employee" };
    }
  }

  return { employees, loading, load, addEmployee, editEmployee, removeEmployee };
}
