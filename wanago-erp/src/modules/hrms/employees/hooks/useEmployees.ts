"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import type { Employee } from "@/modules/hrms/shared/types";
import type { EmployeeSchema } from "@/modules/hrms/employees/schemas";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try { setEmployees(await fetchEmployees()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addEmployee(data: EmployeeSchema) {
    try {
      const e = await createEmployee(data, user?.uid ?? "");
      setEmployees(p => [e, ...p]);
      return { error: null };
    } catch { return { error: "Failed to create employee" }; }
  }

  async function editEmployee(id: string, data: Partial<EmployeeSchema>) {
    try {
      await updateEmployee(id, data);
      setEmployees(p => p.map(e => e.id === id ? { ...e, ...data } : e));
      return { error: null };
    } catch { return { error: "Failed to update employee" }; }
  }

  async function removeEmployee(id: string) {
    try {
      await deleteEmployee(id);
      setEmployees(p => p.filter(e => e.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete employee" }; }
  }

  const stats = {
    total:       employees.length,
    active:      employees.filter(e => e.employeeStatus === "active").length,
    onLeave:     employees.filter(e => e.employeeStatus === "on_leave").length,
    departments: [...new Set(employees.map(e => e.department))].length,
  };

  return { employees, loading, stats, load, addEmployee, editEmployee, removeEmployee };
}
