"use client";

import { useMemo } from "react";
import type { DocumentData } from "firebase/firestore";
import { AlertTriangle, UserX } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { computeGoingColdCustomers, computeBookingAnomalies } from "@/modules/dashboard/services/insights.service";
import type { Booking } from "@/modules/bookings/types";

type Props = {
  // Reuses the same bookings array useDashboard() already fetches once for
  // the whole page (see TopPerformers.tsx's comment on why) — no separate
  // Firestore read for this card.
  bookings: DocumentData[] | null;
  loading: boolean;
};

export function InsightsCard({ bookings, loading }: Props) {
  const goingCold = useMemo(
    () => computeGoingColdCustomers((bookings ?? []) as unknown as Booking[]),
    [bookings]
  );
  const anomalies = useMemo(
    () => computeBookingAnomalies((bookings ?? []) as unknown as Booking[]),
    [bookings]
  );

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardTitle>Insights</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Rule-based patterns from booking history — not a trained model, treat as a heads-up to verify.
        </p>
      </div>

      <div className="space-y-4 px-5 pb-5">
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading...</p>
        ) : anomalies.length === 0 && goingCold.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No unusual patterns right now.</p>
        ) : (
          <>
            {anomalies.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <AlertTriangle size={12} /> Anomalies
                </p>
                {anomalies.map((a, i) => (
                  <div key={i} className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                    {a.message}
                  </div>
                ))}
              </div>
            )}

            {goingCold.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <UserX size={12} /> Repeat customers going cold
                </p>
                {goingCold.map((c) => (
                  <div key={c.customerId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">{c.customerName}</span>
                    <span className="text-muted-foreground">
                      {c.daysSinceLast}d since last booking (usually ~{c.avgGapDays}d)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
