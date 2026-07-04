"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, Wallet, StickyNote } from "lucide-react";
import { invoiceSchema, type InvoiceSchema } from "@/modules/invoices/schemas";
import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Customer } from "@/modules/customers/types";
import type { Booking } from "@/modules/bookings/types";
import type { Invoice } from "@/modules/invoices/types";

type Props = {
  open:     boolean;
  invoice?: Invoice | null;
  onClose:  () => void;
  onSubmit: (data: InvoiceSchema) => Promise<void>;
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

const today = new Date().toISOString().slice(0, 10);

export function InvoiceForm({ open, invoice, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceSchema>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      totalAmount: 0,
      amountPaid:  0,
      issueDate:   today,
      officeId:    user?.officeId   ?? "main",
      officeName:  user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (!open) return;
    fetchCustomers().then(setCustomers).catch(() => {});
    fetchBookings().then(setBookings).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) {
      if (invoice) {
        reset({
          ...invoice,
          bookingId:  invoice.bookingId  ?? "",
          bookingRef: invoice.bookingRef ?? "",
          dueDate:    invoice.dueDate    ?? "",
          notes:      invoice.notes      ?? "",
        });
      } else {
        reset({
          totalAmount: 0, amountPaid: 0, issueDate: today,
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, invoice, reset, user]);

  const selectedCustomerId = watch("customerId");
  const selectedBookingId  = watch("bookingId");

  function handleCustomerChange(id: string) {
    const c = customers.find(c => c.id === id);
    setValue("customerId", id);
    setValue("customerName", c?.fullName ?? "");
    setValue("customerPhone", c?.phone ?? "");
  }

  function handleBookingChange(id: string) {
    const b = bookings.find(b => b.id === id);
    setValue("bookingId", id);
    setValue("bookingRef", b?.refNumber ?? "");
    if (b) {
      handleCustomerChange(b.customerId);
      setValue("totalAmount", b.totalAmount);
      setValue("amountPaid", b.advanceAmount);
    }
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
              <Wallet size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {invoice ? "Edit Invoice" : "New Invoice"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {invoice ? `Editing ${invoice.refNumber}` : "Fill in the details to create a new invoice"}
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

          {/* ── Customer / Booking ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Customer & Booking</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Linked Booking" error={errors.bookingId?.message}>
                <select
                  className={inputClass}
                  value={selectedBookingId ?? ""}
                  onChange={(e) => handleBookingChange(e.target.value)}
                  disabled={!!invoice}
                >
                  <option value="">No booking (standalone)</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>{b.refNumber} — {b.customerName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Customer" required error={errors.customerId?.message}>
                <select
                  className={inputClass}
                  value={selectedCustomerId ?? ""}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  disabled={!!invoice || !!selectedBookingId}
                >
                  <option value="">Select customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Payment ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Payment Details</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Total Amount (₹)" required error={errors.totalAmount?.message}>
                <input className={inputClass} type="number" min={0} placeholder="150000" {...register("totalAmount")} />
              </Field>
              <Field label="Amount Paid (₹)" error={errors.amountPaid?.message}>
                <input className={inputClass} type="number" min={0} placeholder="50000" {...register("amountPaid")} />
              </Field>
              <Field label="Issue Date" required error={errors.issueDate?.message}>
                <input className={inputClass} type="date" {...register("issueDate")} />
              </Field>
              <Field label="Due Date" error={errors.dueDate?.message}>
                <input className={inputClass} type="date" {...register("dueDate")} />
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
                placeholder="Any billing notes or terms..."
                {...register("notes")}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {invoice ? "Changes will be saved immediately" : "Invoice will start as Draft"}
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
              {invoice ? "Save Changes" : "Create Invoice"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
