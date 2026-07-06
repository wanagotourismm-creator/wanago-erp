"use client";

import { Sun, Home, CalendarOff, AlertTriangle, Clock, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { AttendanceRecord, LeaveRequest } from "@/modules/hrms/shared/types";
import type { Holiday } from "@/modules/admin/holidays/types";

type Props = {
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  holidays: Holiday[];
};

export function AttendanceMonthSummary({ attendance, leaves, holidays }: Props) {
  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const thisMonth = attendance.filter((a) => a.date.startsWith(monthPrefix));
  const present  = thisMonth.filter((a) => a.status === "present").length;
  const halfDay  = thisMonth.filter((a) => a.status === "half_day").length;
  const wfh      = thisMonth.filter((a) => a.status === "wfh").length;
  const absent   = thisMonth.filter((a) => a.status === "absent").length;
  const hours    = thisMonth.reduce((s, a) => s + (a.hoursWorked ?? 0), 0);

  const onLeaveDays = leaves
    .filter((l) => l.status === "approved" && l.fromDate.startsWith(monthPrefix))
    .reduce((s, l) => s + l.days, 0);

  const monthHolidays = holidays.filter((h) => h.date.startsWith(monthPrefix));

  const stats = [
    { label: "Present",      value: present,             icon: Sun,          color: "text-green-600" },
    { label: "WFH",          value: wfh,                 icon: Home,         color: "text-cyan-600" },
    { label: "Half Day",     value: halfDay,              icon: Clock,        color: "text-amber-600" },
    { label: "Absent",       value: absent,               icon: AlertTriangle, color: "text-red-600" },
    { label: "On Leave",     value: onLeaveDays,          icon: CalendarOff, color: "text-blue-600" },
    { label: "Hours Logged", value: `${hours.toFixed(1)}h`, icon: Clock,      color: "text-primary" },
  ];

  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold text-foreground mb-1">{monthLabel} Summary</p>
      <p className="text-xs text-muted-foreground mb-4">Your attendance at a glance this month</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <s.icon size={12} className={s.color} />
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
            <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {monthHolidays.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center gap-1.5">
            <PartyPopper size={12} className="text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Holidays this month</p>
          </div>
          <div className="space-y-1.5">
            {monthHolidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{h.name}</span>
                <span className="text-muted-foreground">
                  {new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
