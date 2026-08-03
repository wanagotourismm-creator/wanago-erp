"use client";

import Link from "next/link";
import { Route, PlaneTakeoff, CalendarClock, AlertTriangle, Home } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/helpers";
import type { TourOperationsStats } from "@/modules/dashboard/hooks/useTourOperationsStats";

// Cross-module visibility for the new Tour Operations pipeline — before
// this, the Operations dashboard only knew about Bookings/Packages/
// Suppliers, so nothing here reflected "3 tours on-tour right now" or
// "2 pre-departure checklists due this week" without opening /operations.
export function TourOperationsStatusCard({ stats, loading }: { stats: TourOperationsStats; loading: boolean }) {
  const tiles = [
    { label: "On Tour Now",         value: stats.onTourCount,              icon: PlaneTakeoff,  alert: false },
    { label: "Pre-Departure Due",   value: stats.preDepartureDueSoonCount, icon: CalendarClock, alert: stats.preDepartureDueSoonCount > 0 },
    { label: "Stuck Past Travel Date", value: stats.stuckPastTravelDateCount, icon: AlertTriangle, alert: stats.stuckPastTravelDateCount > 0 },
    { label: "Closure Pending",     value: stats.closureStuckCount,        icon: Home,          alert: stats.closureStuckCount > 0 },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Route size={16} className="text-primary" />
          <CardTitle>Tour Operations</CardTitle>
        </div>
        <Link href="/operations" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <Link
              key={t.label}
              href="/operations"
              className={cn(
                "flex items-center gap-2.5 rounded-xl border p-3 transition-colors hover:border-primary/40",
                t.alert ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10" : "border-border"
              )}
            >
              <t.icon size={16} className={t.alert ? "text-red-600 dark:text-red-400 flex-shrink-0" : "text-muted-foreground flex-shrink-0"} />
              <div className="min-w-0">
                <p className={cn("text-lg font-bold leading-none", t.alert ? "text-red-700 dark:text-red-400" : "text-foreground")}>
                  {t.value}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
