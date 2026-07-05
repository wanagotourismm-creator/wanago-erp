"use client";

import { Users2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, initials } from "@/lib/utils/helpers";
import type { TeamMemberStatus } from "@/modules/ess/hooks/useTeamRoster";

const STATUS_STYLES: Record<string, string> = {
  present:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  half_day: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  wfh:      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  on_leave: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  absent:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  unmarked: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  present: "Present", half_day: "Half Day", wfh: "WFH", on_leave: "On Leave", absent: "Absent", unmarked: "Not Marked",
};

export function TeamRosterPanel({ roster, loading }: { roster: TeamMemberStatus[]; loading: boolean }) {
  if (loading) {
    return <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (roster.length === 0) {
    return <EmptyState title="No direct reports" description="Employees reporting to you will show up here" icon={<Users2 size={22} />} />;
  }

  const presentToday = roster.filter((r) => r.todayStatus === "present" || r.todayStatus === "half_day" || r.todayStatus === "wfh").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center shadow-sm">
          <p className="text-xl font-bold text-foreground">{roster.length}</p>
          <p className="text-[11px] text-muted-foreground">Team Size</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center shadow-sm">
          <p className="text-xl font-bold text-green-600">{presentToday}</p>
          <p className="text-[11px] text-muted-foreground">Present Today</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center shadow-sm">
          <p className="text-xl font-bold text-amber-600">{roster.reduce((s, r) => s + r.pendingRequests, 0)}</p>
          <p className="text-[11px] text-muted-foreground">Pending Requests</p>
        </div>
      </div>

      <div className="space-y-2">
        {roster.map((r) => (
          <div key={r.employee.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials(r.employee.fullName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{r.employee.fullName}</p>
                <p className="text-xs text-muted-foreground">{r.employee.designation} · {r.presentDaysThisMonth} days present this month</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {r.pendingRequests > 0 && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {r.pendingRequests} pending
                </span>
              )}
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[r.todayStatus])}>
                {STATUS_LABELS[r.todayStatus]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
