"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchPayrollRecords, createPayrollRecord, updatePayrollRecord,
  markPayrollProcessed, markPayrollPaid, deletePayrollRecord,
} from "@/modules/hrms/payroll/services/payroll.service";
import { useAuthStore } from "@/store/auth.store";
import type { PayrollRecord } from "@/modules/hrms/shared/types";
import type { PayrollRecordSchema } from "@/modules/hrms/payroll/schemas";

export function usePayroll() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try { setRecords(await fetchPayrollRecords()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generatePayroll(data: PayrollRecordSchema) {
    try {
      const r = await createPayrollRecord(data, user?.uid ?? "");
      setRecords(p => [r, ...p]);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to generate payroll" };
    }
  }

  async function editPayroll(id: string, data: Partial<PayrollRecordSchema>) {
    try {
      await updatePayrollRecord(id, data);
      await load();
      return { error: null };
    } catch { return { error: "Failed to update payroll" }; }
  }

  async function processPayroll(id: string) {
    try {
      await markPayrollProcessed(id);
      setRecords(p => p.map(r => r.id === id ? { ...r, payrollStatus: "processed" } : r));
      return { error: null };
    } catch { return { error: "Failed to mark as processed" }; }
  }

  async function payPayroll(id: string) {
    try {
      await markPayrollPaid(id);
      setRecords(p => p.map(r => r.id === id ? { ...r, payrollStatus: "paid" } : r));
      return { error: null };
    } catch { return { error: "Failed to mark as paid" }; }
  }

  async function removePayroll(id: string) {
    try {
      await deletePayrollRecord(id);
      setRecords(p => p.filter(r => r.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete payroll record" }; }
  }

  const stats = {
    total:       records.length,
    draft:       records.filter(r => r.payrollStatus === "draft").length,
    processed:   records.filter(r => r.payrollStatus === "processed").length,
    paid:        records.filter(r => r.payrollStatus === "paid").length,
    totalPayout: records.filter(r => r.payrollStatus === "paid").reduce((sum, r) => sum + r.netSalary, 0),
  };

  return { records, loading, stats, load, generatePayroll, editPayroll, processPayroll, payPayroll, removePayroll };
}
