import { orderBy, where, serverTimestamp, getDocs, query } from "firebase/firestore";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { PayrollRecord } from "@/modules/hrms/shared/types";
import type { PayrollRecordSchema } from "@/modules/hrms/payroll/schemas";

class PayrollRepository extends BaseRepository<PayrollRecord> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_PAYROLL); }
}
const repo = new PayrollRepository();

function calcTotals(data: {
  basicSalary: number; hra: number; allowances: number;
  incentives: number; bonus: number; deductions: number;
}) {
  const grossSalary = data.basicSalary + data.hra + data.allowances + data.incentives + data.bonus;
  const netSalary    = grossSalary - data.deductions;
  return { grossSalary, netSalary };
}

export async function fetchPayrollRecords(): Promise<PayrollRecord[]> {
  return repo.findMany({ constraints: [orderBy("year", "desc"), orderBy("month", "desc")] });
}

export async function fetchPayrollByEmployee(employeeId: string): Promise<PayrollRecord[]> {
  return repo.findMany({ constraints: [where("employeeId", "==", employeeId), orderBy("year", "desc"), orderBy("month", "desc")] });
}

async function payrollExists(employeeId: string, month: number, year: number): Promise<boolean> {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.HRMS_PAYROLL),
    where("employeeId", "==", employeeId),
    where("month", "==", month),
    where("year", "==", year),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createPayrollRecord(data: PayrollRecordSchema, createdBy: string): Promise<PayrollRecord> {
  const exists = await payrollExists(data.employeeId, data.month, data.year);
  if (exists) throw new Error("Payroll already generated for this employee for the selected month");

  const { grossSalary, netSalary } = calcTotals(data);

  return repo.create({
    ...data,
    grossSalary,
    netSalary,
    status:        "active",
    payrollStatus: "draft",
    paidAt:        null,
    createdBy,
  });
}

export async function updatePayrollRecord(id: string, data: Partial<PayrollRecordSchema>): Promise<void> {
  const patch: Partial<PayrollRecord> = { ...data };
  if (
    data.basicSalary !== undefined || data.hra !== undefined || data.allowances !== undefined ||
    data.incentives !== undefined  || data.bonus !== undefined || data.deductions !== undefined
  ) {
    const existing = await repo.findById(id);
    if (existing) {
      const merged = {
        basicSalary: data.basicSalary ?? existing.basicSalary,
        hra:         data.hra ?? existing.hra,
        allowances:  data.allowances ?? existing.allowances,
        incentives:  data.incentives ?? existing.incentives,
        bonus:       data.bonus ?? existing.bonus,
        deductions:  data.deductions ?? existing.deductions,
      };
      const { grossSalary, netSalary } = calcTotals(merged);
      patch.grossSalary = grossSalary;
      patch.netSalary    = netSalary;
    }
  }
  return repo.update(id, patch);
}

export async function markPayrollProcessed(id: string): Promise<void> {
  return repo.update(id, { payrollStatus: "processed" });
}

export async function markPayrollPaid(id: string): Promise<void> {
  return repo.update(id, { payrollStatus: "paid", paidAt: serverTimestamp() });
}

export async function deletePayrollRecord(id: string): Promise<void> {
  return repo.delete(id);
}
