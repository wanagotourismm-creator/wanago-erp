"use client";

import { Check, X as XIcon, Trash2, Edit2, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate, initials } from "@/lib/utils/helpers";
import { LeaveStatusBadge, LeaveTypeBadge } from "@/modules/hrms/leaves/components/LeaveBadges";
import type { LeaveRequest } from "@/modules/hrms/shared/types";

type Props = {
  leaves: LeaveRequest[];
  loading: boolean;
  canDecide: boolean;
  onView: (l: LeaveRequest) => void;
  onEdit: (l: LeaveRequest) => void;
  onApprove: (l: LeaveRequest) => void;
  onReject: (l: LeaveRequest) => void;
  onDelete: (l: LeaveRequest) => void;
};

export function LeaveTable({ leaves, loading, canDecide, onView, onEdit, onApprove, onReject, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;
  if (leaves.length === 0) return <EmptyState title="No leave requests yet" description="Leave requests will appear here" icon={<span className="text-2xl">🗓️</span>} />;

  return (
    <>
    {/* Desktop table */}
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:block">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Employee","Type","From","To","Days","Reason","Status",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leaves.map(l => (
              <tr key={l.id} onClick={() => onView(l)} className="cursor-pointer hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(l.employeeName)}</div>
                    <p className="font-semibold text-foreground">{l.employeeName}</p>
                  </div>
                </td>
                <td className="px-4 py-3"><LeaveTypeBadge type={l.leaveType} /></td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{formatDate(l.fromDate)}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{formatDate(l.toDate)}</span></td>
                <td className="px-4 py-3"><span className="text-xs font-medium text-foreground">{l.days}</span></td>
                <td className="px-4 py-3 max-w-[200px]"><p className="text-xs text-muted-foreground truncate" title={l.reason}>{l.reason}</p></td>
                <td className="px-4 py-3"><LeaveStatusBadge status={l.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canDecide && l.status === "pending" && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onApprove(l); }} title="Approve"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                          <Check size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onReject(l); }} title="Reject"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                          <XIcon size={14} />
                        </button>
                      </>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(l); }}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(l); }}
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Mobile card list — swipe left to reveal Approve/Reject (pending) or Edit/Delete */}
    <div className="lg:hidden space-y-2.5">
      {leaves.map((l) => {
        const actions: SwipeAction[] = [
          ...(canDecide && l.status === "pending" ? [
            {
              key:       "approve",
              icon:      <Check size={16} />,
              label:     "Approve",
              onClick:   () => onApprove(l),
              className: "bg-green-600",
            },
            {
              key:       "reject",
              icon:      <XIcon size={16} />,
              label:     "Reject",
              onClick:   () => onReject(l),
              className: "bg-red-600",
            },
          ] : []),
          {
            key:       "edit",
            icon:      <Pencil size={16} />,
            label:     "Edit",
            onClick:   () => onEdit(l),
            className: "bg-blue-600",
          },
          {
            key:       "delete",
            icon:      <Trash2 size={16} />,
            label:     "Delete",
            onClick:   () => onDelete(l),
            className: "bg-red-600",
          },
        ];

        return (
          <SwipeableRow
            key={l.id}
            actions={actions}
            onTap={() => onView(l)}
            className="rounded-xl border border-border"
          >
            <div className="card-compact">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(l.employeeName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{l.employeeName}</p>
                    <LeaveTypeBadge type={l.leaveType} />
                  </div>
                </div>
                <LeaveStatusBadge status={l.status} />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                <span className="text-xs text-muted-foreground">
                  {formatDate(l.fromDate)} → {formatDate(l.toDate)}
                </span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {l.days}d
                </span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
