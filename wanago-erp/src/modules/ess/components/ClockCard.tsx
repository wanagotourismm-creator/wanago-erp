"use client";

import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";

type Props = {
  todayRecord: AttendanceRecord | null;
  isClockedIn: boolean;
  isClockedOut: boolean;
  attendance: AttendanceRecord[];
  onClockIn: () => Promise<{ error: string | null }>;
  onClockOut: () => Promise<{ error: string | null }>;
};

export function ClockCard({ todayRecord, isClockedIn, isClockedOut, attendance, onClockIn, onClockOut }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(action: () => Promise<{ error: string | null }>) {
    setBusy(true);
    setError(null);
    const { error } = await action();
    if (error) setError(error);
    setBusy(false);
  }

  const recent = attendance.slice(0, 5);

  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Clock size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">My Attendance</p>
          <p className="text-xs text-muted-foreground">{formatDate(new Date(), "dd MMM yyyy")}</p>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="rounded-2xl border border-border bg-muted/30 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Clock In</p>
            <p className="text-lg font-bold text-foreground">{todayRecord?.clockIn || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Clock Out</p>
            <p className="text-lg font-bold text-foreground">{todayRecord?.clockOut || "—"}</p>
          </div>
        </div>
        {todayRecord?.hoursWorked != null && (
          <p className="text-xs text-muted-foreground">{todayRecord.hoursWorked}h worked today</p>
        )}
      </div>

      {isClockedOut ? (
        <div className="rounded-xl bg-green-100 dark:bg-green-900/30 px-4 py-2.5 text-center text-sm font-medium text-green-700 dark:text-green-400">
          Done for today — see you tomorrow
        </div>
      ) : isClockedIn ? (
        <button onClick={() => handle(onClockOut)} disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-60 transition-colors shadow-sm">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
          Clock Out
        </button>
      ) : (
        <button onClick={() => handle(onClockIn)} disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
          Clock In
        </button>
      )}

      {recent.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1.5">Recent</p>
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
              <span className="text-muted-foreground">{formatDate(r.date, "dd MMM")}</span>
              <span className={cn("font-medium",
                r.status === "present" ? "text-green-600" : r.status === "absent" ? "text-red-600" : "text-muted-foreground")}>
                {r.clockIn && r.clockOut ? `${r.clockIn} – ${r.clockOut}` : r.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
