"use client";

import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { useResources } from "@/modules/resources/hooks/useResources";
import { useResourceBlackouts } from "@/modules/resources/hooks/useResourceBlackouts";
import type { ResourceConflict } from "@/modules/resources/services/conflict.service";
import type { ResourceAssignmentFormData, ResourceBlackout } from "@/modules/resources/types";
import type { Booking } from "@/modules/bookings/types";

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function conflictMessage(conflict: ResourceConflict): string {
  if (conflict.type === "assignment") {
    const a = conflict.assignment;
    return `Already assigned to booking ${a.bookingRefNumber} (${a.customerName}) from ${a.startDate} to ${a.endDate}`;
  }
  return `Blacked out (${conflict.blackout.reason}) from ${conflict.blackout.startDate} to ${conflict.blackout.endDate}`;
}

export function ResourceAssignmentForm({
  presetBookingId, onSave, onCancel,
}: {
  presetBookingId?: string;
  onSave: (data: ResourceAssignmentFormData, blackouts: ResourceBlackout[]) => Promise<{ error: string | null; conflicts?: ResourceConflict[] }>;
  onCancel: () => void;
}) {
  const { resources } = useResources();
  const { blackouts } = useResourceBlackouts();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingId, setBookingId] = useState(presetBookingId ?? "");
  const [resourceId, setResourceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ResourceConflict[]>([]);

  useEffect(() => { fetchBookings().then(setBookings).catch(() => {}); }, []);

  const selectedBooking = useMemo(() => bookings.find((b) => b.id === bookingId) ?? null, [bookings, bookingId]);
  const activeResources = useMemo(() => resources.filter((r) => r.isActive), [resources]);

  function handleBookingChange(id: string) {
    setBookingId(id);
    const booking = bookings.find((b) => b.id === id);
    if (booking?.travelDate) setStartDate(booking.travelDate);
    if (booking?.returnDate) setEndDate(booking.returnDate);
  }

  async function handleSave() {
    setError(null);
    setConflicts([]);
    const resource = activeResources.find((r) => r.id === resourceId);
    if (!selectedBooking || !resource) { setError("Select a booking and a resource."); return; }
    if (!startDate || !endDate) { setError("Start and end dates are required."); return; }
    if (endDate < startDate) { setError("End date can't be before the start date."); return; }

    setSaving(true);
    try {
      const result = await onSave({
        resourceId: resource.id, resourceName: resource.name, resourceType: resource.type,
        bookingId: selectedBooking.id, bookingRefNumber: selectedBooking.refNumber, customerName: selectedBooking.customerName,
        startDate, endDate, notes: notes || null,
      }, blackouts);
      if (result.error) {
        setError(result.error);
        if (result.conflicts) setConflicts(result.conflicts);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Assign Resource</p>
      {error && (
        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p>{error}</p>
          {conflicts.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              <span>{conflictMessage(c)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Booking">
            <select className={inputClass} value={bookingId} onChange={(e) => handleBookingChange(e.target.value)} disabled={!!presetBookingId}>
              <option value="">Select booking</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>{b.refNumber} — {b.customerName} ({b.destination})</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Resource">
            <select className={inputClass} value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
              <option value="">Select resource</option>
              {activeResources.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Start Date">
          <input type="date" className={inputClass} value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End Date">
          <input type="date" className={inputClass} value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <X size={14} /> Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Assign
        </button>
      </div>
    </div>
  );
}
