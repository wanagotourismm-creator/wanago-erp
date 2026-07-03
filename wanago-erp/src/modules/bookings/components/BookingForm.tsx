"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, MapPin, DollarSign, Settings, StickyNote } from "lucide-react";
import { bookingSchema, type BookingSchema } from "@/modules/bookings/schemas";
import { BOOKING_STATUS_OPTIONS } from "@/modules/bookings/components/BookingBadges";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { TRIP_TYPES } from "@/lib/constants";
import type { Booking } from "@/modules/bookings/types";

type Props = { open: boolean; booking?: Booking | null; onClose: () => void; onSubmit: (d: BookingSchema) => Promise<void>; };

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionHead({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={13} className="text-primary" />
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{title}</p>
    </div>
  );
}

export function BookingForm({ open, booking, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<BookingSchema>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { bookingStatus:"pending_finance", paymentStatus:"unpaid", pax:1, paidAmount:0, balanceDue:0, officeId: user?.officeId ?? "main", officeName: user?.officeName ?? "Head Office" },
  });

  const total = watch("totalAmount");
  const paid  = watch("paidAmount");

  useEffect(() => {
    const t = Number(total) || 0, p = Number(paid) || 0, bal = Math.max(0, t - p);
    setValue("balanceDue", bal);
    setValue("paymentStatus", bal <= 0 && t > 0 ? "paid" : p > 0 ? "partial" : "unpaid");
  }, [total, paid, setValue]);

  useEffect(() => {
    if (!open) return;
    if (booking) {
      reset({ ...booking, leadId: booking.leadId ?? "", customerId: booking.customerId ?? "", customerEmail: booking.customerEmail ?? "", assignedTo: booking.assignedTo ?? "", agentName: booking.agentName ?? "", supplierId: booking.supplierId ?? "", supplierName: booking.supplierName ?? "", itinerary: booking.itinerary ?? "", notes: booking.notes ?? "", specialRequests: booking.specialRequests ?? "" });
    } else {
      reset({ bookingStatus:"pending_finance", paymentStatus:"unpaid", pax:1, paidAmount:0, balanceDue:0, officeId: user?.officeId ?? "main", officeName: user?.officeName ?? "Head Office" });
    }
  }, [open, booking, reset, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><MapPin size={16} className="text-primary" /></div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{booking ? "Edit Booking" : "New Booking"}</h2>
              <p className="text-xs text-muted-foreground">{booking ? `Editing ${booking.refNumber}` : "Fill in booking details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">

          {/* Customer */}
          <div>
            <SectionHead icon={User} title="Customer Details" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Customer Name *" error={errors.customerName?.message}><input className={inp} placeholder="Rahul Sharma" {...register("customerName")} /></Field></div>
              <Field label="Phone *" error={errors.customerPhone?.message}><input className={inp} type="tel" placeholder="+91 98765 43210" {...register("customerPhone")} /></Field>
              <Field label="Email" error={errors.customerEmail?.message}><input className={inp} type="email" placeholder="rahul@example.com" {...register("customerEmail")} /></Field>
              <Field label="No. of Pax *" error={errors.pax?.message}><input className={inp} type="number" min={1} placeholder="2" {...register("pax")} /></Field>
              <Field label="Agent Name"><input className={inp} placeholder="Agent name" {...register("agentName")} /></Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Trip */}
          <div>
            <SectionHead icon={MapPin} title="Trip Details" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Destination *" error={errors.destination?.message}><input className={inp} placeholder="Maldives, Bali, Europe..." {...register("destination")} /></Field></div>
              <Field label="Trip Type *" error={errors.tripType?.message}>
                <select className={inp} {...register("tripType")}>
                  <option value="">Select type</option>
                  {Object.values(TRIP_TYPES).map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Duration (nights) *" error={errors.duration?.message}><input className={inp} type="number" min={1} placeholder="7" {...register("duration")} /></Field>
              <Field label="Departure Date *" error={errors.departureDate?.message}><input className={inp} type="date" {...register("departureDate")} /></Field>
              <Field label="Return Date *" error={errors.returnDate?.message}><input className={inp} type="date" {...register("returnDate")} /></Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Finance */}
          <div>
            <SectionHead icon={DollarSign} title="Financial Details" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Total Amount (₹) *" error={errors.totalAmount?.message}><input className={inp} type="number" min={0} placeholder="50000" {...register("totalAmount")} /></Field>
              <Field label="Paid Amount (₹)"><input className={inp} type="number" min={0} placeholder="25000" {...register("paidAmount")} /></Field>
              <Field label="Balance Due (₹)"><input className={cn(inp,"bg-muted/50 cursor-not-allowed")} type="number" readOnly {...register("balanceDue")} /></Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Status */}
          <div>
            <SectionHead icon={Settings} title="Status & Supplier" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Booking Status *" error={errors.bookingStatus?.message}>
                <select className={inp} {...register("bookingStatus")}>
                  {BOOKING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Supplier Name"><input className={inp} placeholder="Supplier name" {...register("supplierName")} /></Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Notes */}
          <div>
            <SectionHead icon={StickyNote} title="Notes" />
            <div className="space-y-4">
              <Field label="Internal Notes"><textarea rows={2} placeholder="Internal notes..." {...register("notes")} className={cn(inp,"resize-none")} /></Field>
              <Field label="Special Requests"><textarea rows={2} placeholder="Customer special requests..." {...register("specialRequests")} className={cn(inp,"resize-none")} /></Field>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">{booking ? "Changes saved immediately" : "Booking added to pipeline"}</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {booking ? "Save Changes" : "Create Booking"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
