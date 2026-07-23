"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ExternalLink } from "lucide-react";
import { fetchSosEventsForBooking, resolveSosEvent } from "@/modules/companion/services/sos-event.service";
import { formatDateTime, cn } from "@/lib/utils/helpers";
import { useAuthStore } from "@/store/auth.store";
import type { SosEvent } from "@/modules/companion/types";

// Read-only history for staff — every real SOS create happens server-side
// via /api/portal/customer/sos (Admin SDK); resolving one here is the one
// legitimate client write, gated to admin by firestore.rules.
export function BookingSosHistory({ bookingId }: { bookingId: string }) {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<SosEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSosEventsForBooking(bookingId).then(setEvents).finally(() => setLoading(false));
  }, [bookingId]);

  async function handleResolve(event: SosEvent) {
    await resolveSosEvent(event.id, user?.uid ?? "");
    setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, sosStatus: "resolved" } : e));
  }

  if (loading || events.length === 0) return null;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <ShieldAlert size={13} className="text-destructive" />
        <p className="text-xs font-bold uppercase tracking-widest text-destructive">SOS History</p>
      </div>
      <div className="divide-y divide-border rounded-xl border border-destructive/30 px-3">
        {events.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", e.sosStatus === "active" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                  {e.sosStatus === "active" ? "Active" : "Resolved"}
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</span>
              </div>
              {e.address && <p className="mt-0.5 truncate text-xs text-foreground">{e.address}</p>}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <a
                href={`https://maps.google.com/?q=${e.lat},${e.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Map <ExternalLink size={11} />
              </a>
              {e.sosStatus === "active" && (
                <button onClick={() => handleResolve(e)} className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors">
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
