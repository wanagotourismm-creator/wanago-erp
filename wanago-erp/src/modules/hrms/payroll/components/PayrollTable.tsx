"use client";

import { useState } from "react";
import { MoreHorizontal, CheckCircle2, Banknote, Trash2, Edit2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { initials, formatCurrency } from "@/lib/utils/helpers";
import { PayrollStatusBadge, MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";
import type { PayrollRecord } from "@/modules/hrms/shared/types";

type Props = {
  records: PayrollRecord[];
  loading: boolean;
  canManage: boolean;
  onEdit: (r: PayrollRecord) => void;
  onProcess: (r: PayrollRecord) => void;
  onPay: (r: PayrollRecord) => void;
  onDelete: (r: PayrollRecord) => void;
};

export function PayrollTable({ records, loading, canManage, onEdit, onProcess, onPay, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={6} />;
  if (records.length === 0) return <EmptyState title="No payroll records yet" description="Generate payroll for an employee to get started" icon={<span className="text-2xl">💰</span>} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Employee","Period","Gross","Deductions","Net Salary","Status",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(r.employeeName)}</div>
                    <p className="font-semibold text-foreground">{r.employeeName}</p>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{MONTH_LABELS[r.month]} {r.year}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-foreground">{formatCurrency(r.grossSalary)}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-destructive">{r.deductions > 0 ? `-${formatCurrency(r.deductions)}` : "—"}</span></td>
                <td className="px-4 py-3"><span className="text-sm font-semibold text-foreground">{formatCurrency(r.netSalary)}</span></td>
                <td className="px-4 py-3"><PayrollStatusBadge status={r.payrollStatus} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canManage && r.payrollStatus === "draft" && (
                      <button onClick={() => onProcess(r)} title="Mark Processed"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    {canManage && r.payrollStatus === "processed" && (
                      <button onClick={() => onPay(r)} title="Mark Paid"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <Banknote size={14} />
                      </button>
                    )}
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === r.id ? null : r.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                        <MoreHorizontal size={15} />
                      </button>
                      {menuOpen === r.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                            <button onClick={() => { onEdit(r); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"><Edit2 size={13} /> Edit</button>
                            <button onClick={() => { onDelete(r); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"><Trash2 size={13} /> Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
