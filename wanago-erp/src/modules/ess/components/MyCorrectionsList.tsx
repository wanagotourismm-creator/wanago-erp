"use client";

import { formatDate, cn } from "@/lib/utils/helpers";
import type { AttendanceRegularization } from "@/modules/hrms/shared/types";

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function MyCorrectionsList({ regularizations }: { regularizations: AttendanceRegularization[] }) {
  if (regularizations.length === 0) return null;

  return (
    <div className="mt-4 space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1.5">My Correction Requests</p>
      {regularizations.slice(0, 5).map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {formatDate(r.date, "dd MMM")}
            {r.requestedClockIn && ` · ${r.requestedClockIn}`}
            {r.requestedClockOut && ` – ${r.requestedClockOut}`}
          </span>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 font-medium", STATUS_STYLES[r.regularizationStatus])}>
            {r.regularizationStatus}
          </span>
        </div>
      ))}
    </div>
  );
}
