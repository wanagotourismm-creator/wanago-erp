import { orderBy, where, serverTimestamp, getDocs, query } from "firebase/firestore";
import { collection } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { uploadFile } from "@/lib/storage/upload";
import { notifyUser } from "@/lib/notify";
import { generatePayslipBlob } from "@/modules/hrms/payroll/services/payslip.service";
import { fetchEmployeeById } from "@/modules/hrms/employees/services/employee.service";
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
  await repo.update(id, { payrollStatus: "paid", paidAt: serverTimestamp() });

  // Best-effort — previously the payslip only ever got generated when
  // someone remembered to open the record and click "Download", so most
  // employees never actually got one. A failure here must never undo the
  // "paid" status, which is already correctly recorded either way.
  try {
    const record = await repo.findById(id);
    if (!record) return;

    const { blob, monthLabel, employeeEmail } = await generatePayslipBlob(record);
    const pdfUrl = await uploadFile(`payslips/${record.employeeId}-${record.year}-${record.month}.pdf`, blob);

    if (employeeEmail) {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      await fetch("/api/hrms/send-payslip-email", {
        method: "POST",
        headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify({
          to: employeeEmail, employeeName: record.employeeName, monthLabel,
          netSalary: record.netSalary, pdfUrl,
        }),
      }).catch(() => {});
    }

    // Employee.userId (not employeeId) is the notification target — same
    // resolution leave.service.ts's notifyLeaveApplicant uses.
    const employee = await fetchEmployeeById(record.employeeId);
    if (employee?.userId) {
      await notifyUser({
        userId: employee.userId, email: employeeEmail,
        title: `Payslip ready — ${monthLabel}`,
        body: `Your ${monthLabel} salary (₹${record.netSalary}) has been paid. Your payslip is available in My HR.`,
        link: "/ess", category: "system",
      });
    }
  } catch (err) {
    console.error("[payroll.service] payslip auto-send failed:", err);
  }
}

export async function deletePayrollRecord(id: string): Promise<void> {
  return repo.delete(id);
}
