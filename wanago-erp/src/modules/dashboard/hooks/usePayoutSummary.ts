"use client";

import { useState, useEffect } from "react";
import { fetchPayrollRecords } from "@/modules/hrms/payroll/services/payroll.service";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import type { PayrollRecord } from "@/modules/hrms/shared/types";

export type PayoutRow = PayrollRecord & { profilePictureUrl: string | null };
export type PayoutTotals = { basicSalary: number; bonus: number; incentives: number; netSalary: number };

export function usePayoutSummary() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [totals, setTotals] = useState<PayoutTotals>({ basicSalary: 0, bonus: 0, incentives: 0, netSalary: 0 });
  const [employeeCount, setEmployeeCount] = useState(0);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPayrollRecords(), fetchEmployees()])
      .then(([records, employees]) => {
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
      })
      .catch((err) => console.error("[usePayoutSummary] failed to load payroll data — showing as empty:", err))
      .finally(() => setLoading(false));
  }, []);

  return { loading, rows, totals, employeeCount, month, year };
}
