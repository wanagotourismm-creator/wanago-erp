"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils/helpers";
import { useJourneys } from "@/modules/journeys/hooks/useJourneys";
import { BarChart3 } from "lucide-react";

// Reads the denormalized counters directly off Journey — rolled forward by
// the journey-engine cron's updateAnalytics(), so no client-side
// aggregation is needed here (unlike Tool 2's reputation dashboard).
// "Opened" isn't tracked (no email open-pixel infra exists); "replied" and
// "converted"/"revenue" are proxies — see journey-engine.server.ts.
export function JourneyAnalytics() {
  const { journeys, loading } = useJourneys();

  if (loading) return <SkeletonTable rows={4} />;
  if (journeys.length === 0) {
    return <EmptyState title="No journeys yet" description="Analytics will show up once a journey has runs" icon={<BarChart3 size={28} className="text-muted-foreground" />} />;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Journey Analytics</CardTitle></CardHeader>
      <p className="mb-3 text-xs text-muted-foreground">
        &quot;Replied&quot; and &quot;Converted&quot; are proxies (a WhatsApp reply / a booking created after entering the journey), not exact attribution. Email opens aren&apos;t tracked.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Journey</th>
              <th className="py-2 pr-4">Entered</th>
              <th className="py-2 pr-4">Sent</th>
              <th className="py-2 pr-4">Replied</th>
              <th className="py-2 pr-4">Converted</th>
              <th className="py-2">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {journeys.map((j) => (
              <tr key={j.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 font-medium text-foreground">{j.name}</td>
                <td className="py-2 pr-4">{j.enteredCount}</td>
                <td className="py-2 pr-4">{j.sentCount}</td>
                <td className="py-2 pr-4">{j.repliedCount}</td>
                <td className="py-2 pr-4">{j.convertedCount}</td>
                <td className="py-2">{formatCurrency(j.revenueTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
