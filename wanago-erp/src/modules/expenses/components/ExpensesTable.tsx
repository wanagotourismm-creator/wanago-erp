"use client";

import { Edit2, Trash2 } from "lucide-react";
import { ExpenseStatusBadge, formatAmount } from "@/modules/expenses/components/ExpenseBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, truncate } from "@/lib/utils/helpers";
import type { Expense } from "@/modules/expenses/types";

type Props = {
  expenses: Expense[];
  loading:  boolean;
  onView:   (expense: Expense) => void;
  onEdit:   (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

export function ExpensesTable({ expenses, loading, onView, onEdit, onDelete }: Props) {
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
