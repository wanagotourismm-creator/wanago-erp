"use client";

import { Edit2, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate, initials } from "@/lib/utils/helpers";
import { AttendanceStatusBadge } from "@/modules/hrms/attendance/components/AttendanceBadges";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";

type Props = {
  records: AttendanceRecord[];
  loading: boolean;
  onView: (r: AttendanceRecord) => void;
  onEdit: (r: AttendanceRecord) => void;
  onDelete: (r: AttendanceRecord) => void;
};

export function AttendanceTable({ records, loading, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;
  if (records.length === 0) return <EmptyState title="No attendance records yet" description="Mark attendance for an employee to get started" icon={<span className="text-2xl">🕐</span>} />;

  return (
    <>
    {/* Desktop table */}
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:block">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Employee","Date","Status","Check In","Check Out","Hours","Notes",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map(r => (
              <tr key={r.id} onClick={() => onView(r)} className="cursor-pointer hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(r.employeeName)}</div>
                    <p className="font-semibold text-foreground">{r.employeeName}</p>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{formatDate(r.date)}</span></td>
                <td className="px-4 py-3"><AttendanceStatusBadge status={r.status} /></td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{r.clockIn ?? "—"}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{r.clockOut ?? "—"}</span></td>
                <td className="px-4 py-3"><span className="text-xs font-medium text-foreground">{r.hoursWorked ?? "—"}</span></td>
                <td className="px-4 py-3 max-w-[160px]"><p className="text-xs text-muted-foreground truncate" title={r.notes ?? undefined}>{r.notes ?? "—"}</p></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(r); }}
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

    {/* Mobile card list — swipe left to reveal Edit/Delete */}
    <div className="lg:hidden space-y-2.5">
      {records.map((r) => {
        const actions: SwipeAction[] = [
          {
            key:       "edit",
            icon:      <Pencil size={16} />,
            label:     "Edit",
            onClick:   () => onEdit(r),
            className: "bg-blue-600",
          },
          {
            key:       "delete",
            icon:      <Trash2 size={16} />,
            label:     "Delete",
            onClick:   () => onDelete(r),
            className: "bg-red-600",
          },
        ];

        return (
          <SwipeableRow
            key={r.id}
            actions={actions}
            onTap={() => onView(r)}
            className="rounded-xl border border-border"
          >
            <div className="card-compact">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(r.employeeName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{r.employeeName}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(r.date)}</p>
                  </div>
                </div>
                <AttendanceStatusBadge status={r.status} />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                <span className="text-xs text-muted-foreground">
                  {r.clockIn ?? "—"} → {r.clockOut ?? "—"}
                </span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {r.hoursWorked ?? "—"}{r.hoursWorked ? "h" : ""}
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
