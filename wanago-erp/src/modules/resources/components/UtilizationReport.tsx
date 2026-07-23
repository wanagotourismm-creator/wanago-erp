"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useResources } from "@/modules/resources/hooks/useResources";
import { useResourceAssignments } from "@/modules/resources/hooks/useResourceAssignments";
import { computeUtilization } from "@/modules/resources/services/conflict.service";

export function UtilizationReport() {
  const [periodStart, setPeriodStart] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const { resources, loading: resourcesLoading } = useResources();
  const { assignments, loading: assignmentsLoading } = useResourceAssignments();

  const rows = useMemo(() => {
    return resources
      .filter((r) => r.isActive)
      .map((r) => ({
        resource: r,
        utilization: computeUtilization(r.id, assignments, { startDate: periodStart, endDate: periodEnd }),
      }))
      .sort((a, b) => b.utilization - a.utilization);
  }, [resources, assignments, periodStart, periodEnd]);

  const loading = resourcesLoading || assignmentsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilization</CardTitle>
        <div className="flex items-center gap-2">
          <input type="date" value={periodStart} max={periodEnd} onChange={(e) => setPeriodStart(e.target.value)} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={periodEnd} min={periodStart} onChange={(e) => setPeriodEnd(e.target.value)} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground" />
        </div>
      </CardHeader>

      {loading ? <SkeletonTable rows={4} /> : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No active resources yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ resource, utilization }) => (
            <div key={resource.id} className="flex items-center gap-3">
              <p className="w-40 flex-shrink-0 truncate text-sm text-foreground">{resource.name}</p>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${utilization}%` }} />
              </div>
              <p className="w-12 flex-shrink-0 text-right text-xs font-medium text-muted-foreground">{utilization.toFixed(0)}%</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
