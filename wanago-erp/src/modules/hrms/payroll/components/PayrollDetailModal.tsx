"use client";

import { useState } from "react";
import { X, Edit2, Trash2, CheckCircle2, Banknote, Download, Loader2, Wallet, User } from "lucide-react";
import { PayrollStatusBadge, MONTH_LABELS, formatSalary } from "@/modules/hrms/payroll/components/PayrollBadges";
import { downloadPayslip } from "@/modules/hrms/payroll/services/payslip.service";
import { initials } from "@/lib/utils/helpers";
import type { PayrollRecord } from "@/modules/hrms/shared/types";

type Props = {
  record:    PayrollRecord | null;
  canManage: boolean;
  onClose:   () => void;
  onEdit:    (r: PayrollRecord) => void;
  onDelete:  (r: PayrollRecord) => void;
  onProcess: (r: PayrollRecord) => void;
  onPay:     (r: PayrollRecord) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function PayrollDetailModal({ record, canManage, onClose, onEdit, onDelete, onProcess, onPay }: Props) {
  const [downloading, setDownloading] = useState(false);

  if (!record) return null;

  async function handleDownload() {
    if (!record) return;
    setDownloading(true);
    try {
      await downloadPayslip(record);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(record.employeeName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{record.employeeName}</h2>
              <p className="text-xs text-muted-foreground">{MONTH_LABELS[record.month]} {record.year}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <PayrollStatusBadge status={record.payrollStatus} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Wallet size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Earnings</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Basic Salary" value={formatSalary(record.basicSalary)} />
              <Row label="HRA" value={formatSalary(record.hra)} />
              <Row label="Allowances" value={formatSalary(record.allowances)} />
              <Row label="Incentives" value={formatSalary(record.incentives)} />
              <Row label="Bonus" value={formatSalary(record.bonus)} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Summary</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Gross Salary" value={formatSalary(record.grossSalary)} />
              <Row label="Deductions" value={record.deductions > 0 ? `-${formatSalary(record.deductions)}` : formatSalary(0)} />
              <Row label="Net Salary" value={<span className="text-base font-bold text-primary">{formatSalary(record.netSalary)}</span>} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  onClick={() => onEdit(record)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => onDelete(record)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download
            </button>
            {canManage && record.payrollStatus === "draft" && (
              <button
                onClick={() => onProcess(record)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 transition-colors"
              >
                <CheckCircle2 size={13} /> Mark Processed
              </button>
            )}
            {canManage && record.payrollStatus === "processed" && (
              <button
                onClick={() => onPay(record)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Banknote size={13} /> Mark Paid
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
