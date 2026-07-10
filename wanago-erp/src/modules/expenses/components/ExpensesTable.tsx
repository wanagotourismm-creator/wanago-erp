"use client";

import { Edit2, Trash2 } from "lucide-react";
import { ExpenseStatusBadge, formatAmount } from "@/modules/expenses/components/ExpenseBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate, truncate } from "@/lib/utils/helpers";
import type { Expense } from "@/modules/expenses/types";

type Props = {
  expenses:  Expense[];
  loading:   boolean;
  canManage: boolean;
  onView:    (expense: Expense) => void;
  onEdit:    (expense: Expense) => void;
  onDelete:  (expense: Expense) => void;
};

export function ExpensesTable({ expenses, loading, canManage, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Log your first expense to get started"
        icon={<span className="text-2xl">🧾</span>}
      />
    );
  }

  return (
    <>
    <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Category", "Description", "Vendor", "Amount", "Date", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map((exp) => (
              <tr
                key={exp.id}
                onClick={() => onView(exp)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >

                {/* Category + ref */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{exp.category}</p>
                    <p className="text-[11px] text-muted-foreground">{exp.refNumber}</p>
                  </div>
                </td>

                {/* Description */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{truncate(exp.description, 50)}</span>
                </td>

                {/* Vendor */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{exp.vendor || "—"}</span>
                </td>

                {/* Amount */}
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-foreground">{formatAmount(exp.amount)}</span>
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(exp.expenseDate)}</span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <ExpenseStatusBadge status={exp.expenseStatus} />
                </td>

                {/* Actions — inline, same line, revealed on row hover */}
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(exp); }}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(exp); }}
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="sm:hidden space-y-2.5">
      {expenses.map((exp) => {
        const actions: SwipeAction[] = canManage ? [
          { key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(exp), className: "bg-primary" },
          { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(exp), className: "bg-red-600" },
        ] : [];
        return (
          <SwipeableRow key={exp.id} actions={actions} onTap={() => onView(exp)} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{exp.category}</p>
                  <p className="text-[11px] text-muted-foreground">{exp.refNumber} · {exp.vendor || "No vendor"}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold text-foreground">{formatAmount(exp.amount)}</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <ExpenseStatusBadge status={exp.expenseStatus} />
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(exp.expenseDate)}</span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
