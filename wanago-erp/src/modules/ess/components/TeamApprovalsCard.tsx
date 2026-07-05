"use client";

import { useState } from "react";
import { Users, Check, X as XIcon, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, initials } from "@/lib/utils/helpers";
import { LeaveTypeBadge } from "@/modules/hrms/leaves/components/LeaveBadges";
import type { LeaveRequest } from "@/modules/hrms/shared/types";

type Props = {
  teamLeaves: LeaveRequest[];
  onDecide: (id: string, decision: "approve" | "reject") => Promise<{ error: string | null }>;
};

export function TeamApprovalsCard({ teamLeaves, onDecide }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handle(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    await onDecide(id, decision);
    setBusyId(null);
  }

  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Users size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Team Approvals</p>
          <p className="text-xs text-muted-foreground">Pending leave requests from your direct reports</p>
        </div>
      </div>

      {teamLeaves.length === 0 ? (
        <EmptyState title="All caught up" description="No pending requests from your team" icon={<span className="text-2xl">✅</span>} />
      ) : (
        <div className="space-y-2">
          {teamLeaves.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials(l.employeeName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{l.employeeName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <LeaveTypeBadge type={l.leaveType} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(l.fromDate)} – {formatDate(l.toDate)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {busyId === l.id ? (
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <button onClick={() => handle(l.id, "approve")} title="Approve"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                      <Check size={15} />
                    </button>
                    <button onClick={() => handle(l.id, "reject")} title="Reject"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                      <XIcon size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
