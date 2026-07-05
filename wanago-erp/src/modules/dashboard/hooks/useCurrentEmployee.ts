"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { fetchEmployeeByUserId } from "@/modules/hrms/employees/services/employee.service";
import type { Employee } from "@/modules/hrms/shared/types";

export function useCurrentEmployee() {
  const { user } = useAuthStore();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    fetchEmployeeByUserId(user.uid, user.email)
      .then((emp) => { if (!cancelled) setEmployee(emp); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  return { employee, loading };
}
