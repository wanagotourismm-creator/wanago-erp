"use client";

import { Users, CheckCircle2, CalendarOff, AlertTriangle, Inbox, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useHrOverview } from "@/modules/hrms/overview/hooks/useHrOverview";
import { cn, initials } from "@/lib/utils/helpers";

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

export function HrOverviewPage() {
  const {
    loading, employeesToday, departmentSummaries,
    headcount, attendancePct, onLeaveToday, absentToday, unmarkedToday, awaitingApproval,
  } = useHrOverview();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const tiles = [
    { label: "Headcount",        value: headcount,           icon: Users,          color: "text-primary" },
    { label: "Attendance Today", value: `${attendancePct}%`, icon: CheckCircle2,   color: "text-green-600" },
    { label: "On Leave Today",   value: onLeaveToday,         icon: CalendarOff,    color: "text-blue-600" },
    { label: "Absent Today",     value: absentToday,          icon: AlertTriangle,  color: "text-red-600" },
    { label: "Not Marked",       value: unmarkedToday,        icon: HelpCircle,     color: "text-gray-500" },
    { label: "Awaiting Approval",value: awaitingApproval,     icon: Inbox,          color: "text-amber-600" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="HR Overview" description="Company-wide attendance and headcount at a glance" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="fluid-card rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <t.icon size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xl font-bold", t.color)}>{t.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{t.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-4">Department Performance</p>
        <div className="space-y-2">
          {departmentSummaries.map((d) => {
            const pct = d.headcount === 0 ? 0 : Math.round((d.presentToday / d.headcount) * 100);
            return (
              <div key={d.department} className="rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">{d.department}</p>
                  <span className="text-sm font-bold text-primary">{pct}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{d.headcount} employees · {d.presentToday} present today</span>
                  {d.pendingApprovals > 0 && (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">
                      {d.pendingApprovals} pending
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-4">Today&apos;s Attendance</p>
        <div className="space-y-2">
          {employeesToday.map(({ employee, status }) => (
            <div key={employee.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials(employee.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{employee.fullName}</p>
                  <p className="text-xs text-muted-foreground">{employee.department}</p>
                </div>
              </div>
              <span className={cn("flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
                {STATUS_LABELS[status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
