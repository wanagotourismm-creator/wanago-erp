"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, MapPin, Wallet, StickyNote } from "lucide-react";
import { bookingSchema, type BookingSchema } from "@/modules/bookings/schemas";
import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchPackages } from "@/modules/packages/services/package.service";
import { SalesAgentSelect } from "@/components/shared/SalesAgentSelect";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { TRIP_TYPES } from "@/lib/constants";
import type { Customer } from "@/modules/customers/types";
import type { Package } from "@/modules/packages/types";
import type { Booking } from "@/modules/bookings/types";

type Props = {
  open:     boolean;
  booking?: Booking | null;
  onClose:  () => void;
  onSubmit: (data: BookingSchema) => Promise<void>;
};

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function BookingForm({ open, booking, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages,  setPackages]  = useState<Package[]>([]);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingSchema>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      pax:           1,
      totalAmount:   0,
      advanceAmount: 0,
      officeId:      user?.officeId   ?? "main",
      officeName:    user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (!open) return;
    fetchCustomers().then(setCustomers).catch(() => {});
    fetchPackages().then(setPackages).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) {
      if (booking) {
        reset({
          ...booking,
          packageId:   booking.packageId   ?? "",
          packageName: booking.packageName ?? "",
          travelDate:  booking.travelDate  ?? "",
          returnDate:  booking.returnDate  ?? "",
          assignedTo:  booking.assignedTo  ?? "",
          agentName:   booking.agentName   ?? "",
          notes:       booking.notes       ?? "",
          leadId:      booking.leadId      ?? null,
        });
      } else {
        reset({
          pax: 1, totalAmount: 0, advanceAmount: 0,
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, booking, reset, user]);

  const selectedCustomerId = watch("customerId");

  function handleCustomerChange(id: string) {
    const c = customers.find(c => c.id === id);
    setValue("customerId", id);
    setValue("customerName", c?.fullName ?? "");
    setValue("customerPhone", c?.phone ?? "");
    setValue("leadId", c?.convertedFromLeadId ?? null);
  }

  const selectedPackageId = watch("packageId");

  function handlePackageChange(id: string) {
    const p = packages.find(p => p.id === id);
    setValue("packageId", id);
    setValue("packageName", p?.title ?? "");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <User size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {booking ? "Edit Booking" : "New Booking"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {booking ? `Editing ${booking.refNumber}` : "Fill in the details to create a new booking"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">

          {/* ── Customer ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Customer</p>
            </div>
            <Field label="Customer" required error={errors.customerId?.message}>
              <select
                className={inputClass}
                value={selectedCustomerId ?? ""}
                onChange={(e) => handleCustomerChange(e.target.value)}
                disabled={!!booking}
              >
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Trip ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <Field label="Destination" required error={errors.destination?.message}>
                  <input className={inputClass} placeholder="e.g. Maldives, Bali, Europe..." {...register("destination")} />
                </Field>
              </div>
              <Field label="Trip Type" required error={errors.tripType?.message}>
                <select className={inputClass} {...register("tripType")}>
                  <option value="">Select type</option>
                  {Object.entries(TRIP_TYPES).map(([k, v]) => (
                    <option key={k} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Package" error={errors.packageId?.message}>
                <select
                  className={inputClass}
                  value={selectedPackageId ?? ""}
                  onChange={(e) => handlePackageChange(e.target.value)}
                >
                  <option value="">No package</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.title} — {p.destination}</option>
                  ))}
                </select>
              </Field>
              <Field label="Travel Date" error={errors.travelDate?.message}>
                <input className={inputClass} type="date" {...register("travelDate")} />
              </Field>
              <Field label="Return Date" error={errors.returnDate?.message}>
                <input className={inputClass} type="date" {...register("returnDate")} />
              </Field>
              <Field label="No. of Pax" required error={errors.pax?.message}>
                <input className={inputClass} type="number" min={1} placeholder="2" {...register("pax")} />
              </Field>
              <Field label="Assigned Agent" error={errors.assignedTo?.message}>
                <SalesAgentSelect
                  value={watch("assignedTo")}
                  onChange={(id, name) => {
                    setValue("assignedTo", id);
                    setValue("agentName", name);
                  }}
                />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Payment ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Payment</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Total Amount (₹)" required error={errors.totalAmount?.message}>
                <input className={inputClass} type="number" min={0} placeholder="150000" {...register("totalAmount")} />
              </Field>
              <Field label="Advance Received (₹)" error={errors.advanceAmount?.message}>
                <input className={inputClass} type="number" min={0} placeholder="50000" {...register("advanceAmount")} />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Notes ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <StickyNote size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
            </div>
            <Field label="Additional Notes" error={errors.notes?.message}>
              <textarea
                rows={3}
                placeholder="Any special requirements, preferences, or notes..."
                {...register("notes")}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {booking ? "Changes will be saved immediately" : "Booking will start in Pending Finance status"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {booking ? "Save Changes" : "Create Booking"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
