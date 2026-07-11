"use client";

import { useState, useEffect } from "react";
import { fetchPayrollRecords } from "@/modules/hrms/payroll/services/payroll.service";
import type { Employee, PayrollRecord } from "@/modules/hrms/shared/types";

export type PayoutRow = PayrollRecord & { profilePictureUrl: string | null };
export type PayoutTotals = { basicSalary: number; bonus: number; incentives: number; netSalary: number };

// Takes the Employees list from useDashboardEmployees() (shared with
// useEmployeeBreakdown) instead of fetching its own copy of the same
// full-collection data — Payroll records are still fetched here directly
// since that's a different collection, not part of the duplication.
export function usePayoutSummary(employees: Employee[] | null, employeesLoading: boolean) {
  const [records, setRecords] = useState<PayrollRecord[] | null>(null);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [totals, setTotals] = useState<PayoutTotals>({ basicSalary: 0, bonus: 0, incentives: 0, netSalary: 0 });
  const [employeeCount, setEmployeeCount] = useState(0);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchPayrollRecords()
      .then(setRecords)
      .catch((err) => {
        console.error("[usePayoutSummary] failed to load payroll data — showing as empty:", err);
        setRecords([]);
      })
      .finally(() => setPayrollLoading(false));
  }, []);

  useEffect(() => {
    if (!records || !employees) return;

    const photoMap = new Map(employees.map((e) => [e.id, e.profilePictureUrl]));
    setRows(records.slice(0, 6).map((r) => ({ ...r, profilePictureUrl: photoMap.get(r.employeeId) ?? null })));

    const latestKey = records.reduce((max, r) => Math.max(max, r.year * 12 + r.month), 0);
    const latestRecords = records.filter((r) => r.year * 12 + r.month === latestKey);

    setTotals(latestRecords.reduce((acc, r) => ({
      basicSalary: acc.basicSalary + r.basicSalary,
      bonus:       acc.bonus + r.bonus,
      incentives:  acc.incentives + r.incentives,
      netSalary:   acc.netSalary + r.netSalary,
    }), { basicSalary: 0, bonus: 0, incentives: 0, netSalary: 0 }));

    setEmployeeCount(latestRecords.length);
    setMonth(latestRecords[0]?.month);
    setYear(latestRecords[0]?.year);
  }, [records, employees]);

  return { loading: payrollLoading || employeesLoading, rows, totals, employeeCount, month, year };
}
