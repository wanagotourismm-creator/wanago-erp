"use client";

import { X, Edit2, Trash2, CheckCircle2, XCircle, Banknote, Receipt, Building2, Paperclip } from "lucide-react";
import { ExpenseStatusBadge, formatAmount } from "@/modules/expenses/components/ExpenseBadges";
import { formatDate } from "@/lib/utils/helpers";
import type { Expense } from "@/modules/expenses/types";

type Props = {
  expense:   Expense | null;
  canManage: boolean;
  onClose:   () => void;
  onEdit:    (expense: Expense) => void;
  onDelete:  (expense: Expense) => void;
  onStatusChange: (expense: Expense, status: Expense["expenseStatus"]) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function ExpenseDetailModal({ expense, canManage, onClose, onEdit, onDelete, onStatusChange }: Props) {
  if (!expense) return null;

  const canApproveOrReject = canManage && expense.expenseStatus === "pending";
  const canMarkPaid        = canManage && expense.expenseStatus === "approved";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Receipt size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{expense.category}</h2>
              <p className="text-xs text-muted-foreground">{expense.refNumber} · {formatDate(expense.expenseDate)}</p>
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
            <ExpenseStatusBadge status={expense.expenseStatus} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Receipt size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Expense Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Amount" value={formatAmount(expense.amount)} />
              <Row label="Vendor" value={expense.vendor} />
              <Row label="Expense Date" value={formatDate(expense.expenseDate)} />
              <Row label="Description" value={expense.description} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Building2 size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Office</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Office" value={expense.officeName} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Paperclip size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Receipt</p>
            </div>
            {expense.receiptUrl ? (
              <a
                href={expense.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-primary hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Paperclip size={13} /> View Receipt
              </a>
            ) : (
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                No receipt attached
              </p>
            )}
          </div>

          {expense.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {expense.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(expense)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(expense)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
          <div className="flex items-center gap-2">
            {canApproveOrReject && (
              <>
                <button
                  onClick={() => onStatusChange(expense, "rejected")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <XCircle size={13} /> Reject
                </button>
                <button
                  onClick={() => onStatusChange(expense, "approved")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <CheckCircle2 size={13} /> Approve
                </button>
              </>
            )}
            {canMarkPaid && (
              <button
                onClick={() => onStatusChange(expense, "paid")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Banknote size={13} /> Mark Paid
              </button>
            )}
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
