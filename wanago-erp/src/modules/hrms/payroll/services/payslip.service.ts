import { fetchEmployeeById } from "@/modules/hrms/employees/services/employee.service";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { formatCurrency } from "@/lib/utils/helpers";
import { MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";
import type { PayrollRecord } from "@/modules/hrms/shared/types";

// jsPDF/autotable are dynamically imported so they're only downloaded
// when a payslip is actually generated, instead of bloating the
// Payroll page's initial bundle.
export async function downloadPayslip(record: PayrollRecord): Promise<void> {
  const [employee, company, { default: jsPDF }, { default: autoTable }] = await Promise.all([
    fetchEmployeeById(record.employeeId),
    fetchCompanySettings(),
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const monthLabel = `${MONTH_LABELS[record.month]} ${record.year}`;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(company.businessName, 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const addressLine = [company.address, company.city].filter(Boolean).join(", ");
  if (addressLine) doc.text(addressLine, 14, 24);
  if (company.gstNumber) doc.text(`GSTIN: ${company.gstNumber}`, 14, 29);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Payslip — ${monthLabel}`, 14, 40);

  // Employee details
  autoTable(doc, {
    startY: 46,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1 },
    body: [
      ["Employee Name", record.employeeName, "Employee Code", employee?.employeeCode ?? "—"],
      ["Designation", employee?.designation ?? "—", "Department", employee?.department ?? "—"],
      ["Bank Account", employee?.bankAccountNumber ?? "—", "PAN", employee?.panNumber ?? "—"],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      2: { fontStyle: "bold", cellWidth: 35 },
    },
  });

  const afterDetailsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Earnings & Deductions
  autoTable(doc, {
    startY: afterDetailsY,
    head: [["Earnings", "Amount", "Deductions", "Amount"]],
    body: [
      ["Basic Salary",  formatCurrency(record.basicSalary),  "Deductions", formatCurrency(record.deductions)],
      ["HRA",           formatCurrency(record.hra),           "", ""],
      ["Allowances",    formatCurrency(record.allowances),    "", ""],
      ["Incentives",    formatCurrency(record.incentives),    "", ""],
      ["Bonus",         formatCurrency(record.bonus),         "", ""],
    ],
    foot: [["Gross Salary", formatCurrency(record.grossSalary), "Net Salary", formatCurrency(record.netSalary)]],
    theme: "grid",
    headStyles: { fillColor: [22, 74, 50] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("This is a computer-generated payslip and does not require a signature.", 14, finalY);

  doc.save(`Payslip-${record.employeeName.replace(/\s+/g, "_")}-${monthLabel.replace(/\s+/g, "_")}.pdf`);
}
