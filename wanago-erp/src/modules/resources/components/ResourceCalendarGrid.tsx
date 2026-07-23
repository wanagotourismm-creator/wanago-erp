"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths } from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import { useResources } from "@/modules/resources/hooks/useResources";
import { useResourceAssignments } from "@/modules/resources/hooks/useResourceAssignments";
import { useResourceBlackouts } from "@/modules/resources/hooks/useResourceBlackouts";

function toIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function ResourceCalendarGrid() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const { resources, loading: resourcesLoading } = useResources();
  const { assignments, loading: assignmentsLoading } = useResourceAssignments();
  const { blackouts, loading: blackoutsLoading } = useResourceBlackouts();

  const days = useMemo(() => eachDayOfInterval({ start: month, end: endOfMonth(month) }), [month]);
  const activeResources = useMemo(() => resources.filter((r) => r.isActive), [resources]);

  function cellFor(resourceId: string, dayIso: string) {
    const assignment = assignments.find((a) => a.resourceId === resourceId && a.startDate <= dayIso && dayIso <= a.endDate);
    if (assignment) return { label: assignment.customerName, tone: "assigned" as const };
    const blackout = blackouts.find((b) => b.resourceId === resourceId && b.startDate <= dayIso && dayIso <= b.endDate);
    if (blackout) return { label: "—", tone: "blackout" as const };
    return null;
  }

  const loading = resourcesLoading || assignmentsLoading || blackoutsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
            <ChevronLeft size={14} />
          </button>
          <p className="w-28 text-center text-sm font-medium text-foreground">{format(month, "MMMM yyyy")}</p>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </CardHeader>

      {loading ? <SkeletonTable rows={4} /> : activeResources.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No active resources yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left font-medium text-muted-foreground">Resource</th>
                {days.map((d) => (
                  <th key={toIso(d)} className="min-w-[32px] px-1 py-1.5 text-center font-medium text-muted-foreground">{format(d, "d")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeResources.map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="sticky left-0 z-10 bg-card px-2 py-1.5 font-medium text-foreground whitespace-nowrap">{r.name}</td>
                  {days.map((d) => {
                    const cell = cellFor(r.id, toIso(d));
                    return (
                      <td key={toIso(d)} className="px-1 py-1.5 text-center">
                        {cell && (
                          <div
                            title={cell.label}
                            className={cn(
                              "mx-auto h-5 w-6 truncate rounded text-[9px] leading-5",
                              cell.tone === "assigned" ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"
                            )}
                          >
                            {cell.tone === "assigned" ? cell.label.slice(0, 3) : "×"}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
