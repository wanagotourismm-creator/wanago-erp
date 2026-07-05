"use client";

import { PartyPopper } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils/helpers";
import type { Holiday } from "@/modules/admin/holidays/types";

export function HolidaysCard({ holidays }: { holidays: Holiday[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date >= today).slice(0, 8);

  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <PartyPopper size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Upcoming Holidays</p>
          <p className="text-xs text-muted-foreground">Company holiday calendar</p>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState title="No upcoming holidays" description="Check back later" icon={<span className="text-2xl">📅</span>} />
      ) : (
        <div className="space-y-2">
          {upcoming.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <p className="text-sm font-medium text-foreground">{h.name}</p>
              <p className="text-xs text-muted-foreground">{formatDate(h.date, "dd MMM yyyy")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
