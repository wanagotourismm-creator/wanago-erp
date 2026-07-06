"use client";

import { Edit2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
  );
}
