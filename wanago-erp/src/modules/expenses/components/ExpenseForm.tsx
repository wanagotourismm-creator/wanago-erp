"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Receipt, Paperclip, StickyNote, Camera } from "lucide-react";
import { expenseSchema, type ExpenseSchema } from "@/modules/expenses/schemas";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Booking } from "@/modules/bookings/types";
import type { Expense } from "@/modules/expenses/types";

type Props = {
  open:     boolean;
  expense?: Expense | null;
  onClose:  () => void;
  onSubmit: (data: ExpenseSchema, receiptFile: File | null) => Promise<void>;
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

const CATEGORY_SUGGESTIONS = ["Travel", "Office Supplies", "Utilities", "Marketing", "Other"];

const today = new Date().toISOString().slice(0, 10);

export function ExpenseForm({ open, expense, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBookings().then(setBookings).catch(() => {});
  }, []);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseSchema>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount:      0,
      expenseDate: today,
      officeId:    user?.officeId   ?? "main",
      officeName:  user?.officeName ?? "Head Office",
      expenseStatus: "pending",
    },
  });

  useEffect(() => {
    if (open) {
      setReceiptFile(null);
      if (expense) {
        reset({
          ...expense,
          vendor:     expense.vendor     ?? "",
          notes:      expense.notes      ?? "",
          bookingId:  expense.bookingId  ?? "",
          bookingRef: expense.bookingRef ?? "",
        });
      } else {
        reset({
          amount: 0, expenseDate: today,
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
          expenseStatus: "pending",
        });
      }
    }
  }, [open, expense, reset, user]);

  const selectedBookingId = watch("bookingId");

  function handleBookingChange(id: string) {
    const b = bookings.find(b => b.id === id);
    setValue("bookingId", id);
    setValue("bookingRef", b?.refNumber ?? "");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="modal-enter relative w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Receipt size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {expense ? "Edit Expense" : "New Expense"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {expense ? `Editing ${expense.refNumber}` : "Log a new company expense"}
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

          {/* ── Expense Details ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Receipt size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Expense Details</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category" required error={errors.category?.message}>
                <input
                  className={inputClass}
                  list="expense-category-suggestions"
                  placeholder="Travel"
                  {...register("category")}
                />
                <datalist id="expense-category-suggestions">
                  {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Amount (₹)" required error={errors.amount?.message}>
                <input className={inputClass} type="number" min={0} step="0.01" placeholder="1500" {...register("amount")} />
              </Field>
              <Field label="Expense Date" required error={errors.expenseDate?.message}>
                <input className={inputClass} type="date" {...register("expenseDate")} />
              </Field>
              <Field label="Vendor" error={errors.vendor?.message}>
                <input className={inputClass} placeholder="Vendor name" {...register("vendor")} />
              </Field>
              <Field label="Link to Booking (optional)" error={errors.bookingId?.message}>
                <select
                  className={inputClass}
                  value={selectedBookingId ?? ""}
                  onChange={(e) => handleBookingChange(e.target.value)}
                >
                  <option value="">Not trip-specific</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>{b.refNumber} — {b.customerName}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Description" required error={errors.description?.message}>
                <textarea
                  rows={2}
                  placeholder="What was this expense for?"
                  {...register("description")}
                  className={cn(inputClass, "resize-none")}
                />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Receipt ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Paperclip size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Receipt</p>
            </div>
            <Field label={expense?.receiptUrl ? "Replace Receipt" : "Attach Receipt"}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border-0 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Camera size={13} />
                  Take Photo
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
            </Field>
            {expense?.receiptUrl && !receiptFile && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                A receipt is already attached. Choosing a new file will replace it.
              </p>
            )}
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
                placeholder="Any additional notes..."
                {...register("notes")}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {expense ? "Changes will be saved immediately" : "New expenses start as Pending"}
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
              onClick={handleSubmit((data) => onSubmit(data, receiptFile))}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {expense ? "Save Changes" : "Create Expense"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
