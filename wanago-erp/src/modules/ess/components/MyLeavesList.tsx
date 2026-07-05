"use client";

import { X, Plus, CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils/helpers";
import { LeaveStatusBadge, LeaveTypeBadge } from "@/modules/hrms/leaves/components/LeaveBadges";
import type { LeaveRequest } from "@/modules/hrms/shared/types";

type Props = {
  leaves: LeaveRequest[];
  onApply: () => void;
  onCancel: (l: LeaveRequest) => void;
};

export function MyLeavesList({ leaves, onApply, onCancel }: Props) {
  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">My Leaves</p>
            <p className="text-xs text-muted-foreground">{leaves.length} request{leaves.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <button onClick={onApply}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm">
          <Plus size={13} /> Apply
        </button>
      </div>

      {leaves.length === 0 ? (
        <EmptyState title="No leave requests yet" description="Apply for leave and it'll show up here" icon={<span className="text-2xl">🗓️</span>} />
      ) : (
        <div className="space-y-2">
          {leaves.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <LeaveTypeBadge type={l.leaveType} />
                  <LeaveStatusBadge status={l.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(l.fromDate)} – {formatDate(l.toDate)} · {l.days} day{l.days === 1 ? "" : "s"}
                </p>
              </div>
              {l.status === "pending" && (
                <button onClick={() => onCancel(l)} title="Cancel request"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
