"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarRange, PencilLine } from "lucide-react";
import { cn, formatDate } from "@/lib/utils/helpers";
import type { AttendanceRecord, LeaveRequest } from "@/modules/hrms/shared/types";
import type { Holiday } from "@/modules/admin/holidays/types";

type Props = {
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  holidays: Holiday[];
  weeklyOffDays: number[];
  onRequestCorrection: (date: string) => void;
};

const DAY_COLORS: Record<string, string> = {
  present:  "bg-green-500 text-white",
  half_day: "bg-amber-400 text-white",
  absent:   "bg-red-500 text-white",
  leave:    "bg-blue-500 text-white",
  wfh:      "bg-cyan-500 text-white",
  holiday:  "bg-purple-500 text-white",
  week_off: "bg-muted text-muted-foreground",
  unmarked: "text-muted-foreground",
};

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function AttendanceCalendar({ attendance, leaves, holidays, weeklyOffDays, onRequestCorrection }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const attendanceByDate = useMemo(() => new Map(attendance.map((a) => [a.date, a])), [attendance]);
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const approvedLeaveDates = useMemo(() => {
    const set = new Set<string>();
    for (const l of leaves) {
      if (l.status !== "approved") continue;
      const from = new Date(l.fromDate);
      const to = new Date(l.toDate);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        set.add(d.toISOString().slice(0, 10));
      }
    }
    return set;
  }, [leaves]);

  function statusFor(dateStr: string, weekday: number): string {
    const record = attendanceByDate.get(dateStr);
    if (record) return record.status;
    if (approvedLeaveDates.has(dateStr)) return "leave";
    if (holidaySet.has(dateStr)) return "holiday";
    if (weeklyOffDays.includes(weekday)) return "week_off";
    return "unmarked";
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const selectedRecord = attendanceByDate.get(selected) ?? null;
  const gross = attendance.reduce((s, a) => s + (a.hoursWorked ?? 0), 0);
  const presentCount = attendance.filter((a) => a.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) && a.status === "present").length;

  return (
    <div className="fluid-card max-w-lg rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <CalendarRange size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{formatDate(cursor, "MMMM yyyy")}</p>
            <p className="text-xs text-muted-foreground">{presentCount} present this month · {gross.toFixed(1)}h gross</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft size={14} /></button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold uppercase text-muted-foreground/60">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 justify-items-center">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = toDateStr(year, month, d);
          const weekday = new Date(year, month, d).getDay();
          const status = statusFor(dateStr, weekday);
          const isSelected = dateStr === selected;
          const isFuture = new Date(dateStr) > today;
          return (
            <button key={i} onClick={() => setSelected(dateStr)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all",
                isFuture ? "text-muted-foreground/40" : DAY_COLORS[status],
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-card"
              )}>
              {d}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {[["present","Present"],["leave","Leave"],["half_day","Half Day"],["wfh","WFH"],["holiday","Holiday"],["absent","Absent"]].map(([k,l]) => (
          <span key={k} className="flex items-center gap-1"><span className={cn("h-2.5 w-2.5 rounded-full", DAY_COLORS[k])} />{l}</span>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground">{formatDate(selected, "EEEE, dd MMM yyyy")}</p>
          {new Date(selected) <= today && (
            <button onClick={() => onRequestCorrection(selected)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-background transition-colors">
              <PencilLine size={12} /> Request Correction
            </button>
          )}
        </div>
        {selectedRecord ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><p className="text-[10px] uppercase text-muted-foreground">In Time</p><p className="text-sm font-bold text-foreground">{selectedRecord.clockIn || "—"}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Out Time</p><p className="text-sm font-bold text-foreground">{selectedRecord.clockOut || "Not yet"}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Hours</p><p className="text-sm font-bold text-foreground">{selectedRecord.hoursWorked ?? "—"}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Break</p><p className="text-sm font-bold text-foreground">{selectedRecord.breakMinutes ?? 0}m</p></div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {approvedLeaveDates.has(selected) ? "On approved leave" : holidaySet.has(selected) ? "Company holiday" : "No attendance record for this day"}
          </p>
        )}
      </div>
    </div>
  );
}
