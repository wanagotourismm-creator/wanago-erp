"use client";

import { useMemo, useState } from "react";
import { Truck, Plus, Trash2 } from "lucide-react";
import { useResourceAssignments } from "@/modules/resources/hooks/useResourceAssignments";
import { ResourceAssignmentForm } from "@/modules/resources/components/ResourceAssignmentForm";
import type { Booking } from "@/modules/bookings/types";

// Mounted inside BookingDetailModal — shows this booking's existing
// resource assignments and lets staff assign one without leaving the
// booking, rather than only being reachable from the standalone
// /resources page.
export function BookingResourcesSection({ booking }: { booking: Booking }) {
  const { assignments, loading, addAssignment, removeAssignment } = useResourceAssignments();
  const [assigning, setAssigning] = useState(false);

  const bookingAssignments = useMemo(
    () => assignments.filter((a) => a.bookingId === booking.id),
    [assignments, booking.id]
  );

  if (loading) return null;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck size={13} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Resources</p>
        </div>
        {!assigning && (
          <button onClick={() => setAssigning(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Plus size={12} /> Assign
          </button>
        )}
      </div>

      {assigning && (
        <div className="mb-2">
          <ResourceAssignmentForm
            presetBookingId={booking.id}
            onSave={(data, blackouts) => addAssignment(data, blackouts).then((r) => { if (!r.error) setAssigning(false); return r; })}
            onCancel={() => setAssigning(false)}
          />
        </div>
      )}

      {bookingAssignments.length === 0 ? (
        <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">No resources assigned yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border px-3">
          {bookingAssignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-foreground">{a.resourceName} <span className="text-xs text-muted-foreground">({a.startDate} → {a.endDate})</span></span>
              <button onClick={() => removeAssignment(a)} className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
