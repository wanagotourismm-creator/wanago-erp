"use client";

import { Plane } from "lucide-react";
import { AnimatedCounter } from "@/modules/portal/components/AnimatedCounter";
import type { CustomerPortalBooking } from "@/modules/portal/services/customer-portal.service";

type Props = { bookings: CustomerPortalBooking[] };

// Finds the soonest upcoming trip among confirmed/completed bookings with a
// future travel date — shows nothing at all if there isn't one, rather
// than a countdown to a past or unconfirmed date.
export function TripCountdown({ bookings }: Props) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const upcoming = bookings
    .filter(b => (b.status === "confirmed" || b.status === "completed") && b.travelDate)
    .map(b => ({ b, date: new Date(b.travelDate as string) }))
    .filter(x => !Number.isNaN(x.date.getTime()) && x.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  if (!upcoming) return null;

  const daysLeft = Math.round((upcoming.date.getTime() - today.getTime()) / 86_400_000);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
      <Plane size={72} className="pointer-events-none absolute -right-3 -top-3 rotate-45 text-primary/10" />
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Your Next Trip</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-foreground">
          <AnimatedCounter value={daysLeft} />
        </span>
        <span className="text-sm text-muted-foreground">day{daysLeft === 1 ? "" : "s"} to go</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{upcoming.b.packageName ?? upcoming.b.destination}</p>
    </div>
  );
}
