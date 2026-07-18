"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Wallet, StickyNote } from "lucide-react";
import { paymentSchema, type PaymentSchema } from "@/modules/payments/schemas";
import { PAYMENT_METHODS } from "@/modules/payments/components/PaymentBadges";
import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { useAuthStore } from "@/store/auth.store";
import { cn, formatCurrency } from "@/lib/utils/helpers";
import type { Customer } from "@/modules/customers/types";
import type { Invoice } from "@/modules/invoices/types";

type Props = {
  open:     boolean;
  onClose:  () => void;
  onSubmit: (data: PaymentSchema) => Promise<void>;
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

export function PaymentForm({ open, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices,  setInvoices]  = useState<Invoice[]>([]);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentSchema>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount:      0,
      paymentDate: today,
      officeId:    user?.officeId   ?? "main",
      officeName:  user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (!open) return;
    fetchCustomers().then(setCustomers).catch(() => {});
    fetchInvoices().then(inv => setInvoices(inv.filter(i => i.balanceDue > 0))).catch(() => {});
    reset({
      amount: 0, paymentDate: today,
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    });
  }, [open, reset, user]);

  const selectedCustomerId = watch("customerId");
  const selectedInvoiceId  = watch("invoiceId");

  function handleCustomerChange(id: string) {
    const c = customers.find(c => c.id === id);
    setValue("customerId", id);
    setValue("customerName", c?.fullName ?? "");
  }

  function handleInvoiceChange(id: string) {
    const inv = invoices.find(i => i.id === id);
    setValue("invoiceId", id);
    setValue("invoiceRef", inv?.refNumber ?? "");
    if (inv) {
      handleCustomerChange(inv.customerId);
      setValue("amount", inv.balanceDue);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Wallet size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Record Payment</h2>
              <p className="text-xs text-muted-foreground">Log a payment received from a customer</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">

          <Field label="Linked Invoice" error={errors.invoiceId?.message}>
            <select
              className={inputClass}
              value={selectedInvoiceId ?? ""}
              onChange={(e) => handleInvoiceChange(e.target.value)}
            >
              <option value="">No invoice (standalone)</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.refNumber} — {inv.customerName} (Due: {formatCurrency(inv.balanceDue)})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Customer" required error={errors.customerId?.message}>
            <select
              className={inputClass}
              value={selectedCustomerId ?? ""}
              onChange={(e) => handleCustomerChange(e.target.value)}
              disabled={!!selectedInvoiceId}
            >
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Amount (₹)" required error={errors.amount?.message}>
              <input className={inputClass} type="number" min={1} placeholder="50000" {...register("amount")} />
            </Field>
            <Field label="Payment Method" required error={errors.paymentMethod?.message}>
              <select className={inputClass} {...register("paymentMethod")}>
                <option value="">Select method</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Payment Date" required error={errors.paymentDate?.message}>
              <input className={inputClass} type="date" {...register("paymentDate")} />
            </Field>
            <Field label="Reference No." error={errors.referenceNumber?.message}>
              <input className={inputClass} placeholder="UTR / Txn ID" {...register("referenceNumber")} />
            </Field>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
            </div>
            <textarea
              rows={2}
              placeholder="Any notes about this payment..."
              {...register("notes")}
              className={cn(inputClass, "resize-none")}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {selectedInvoiceId ? "Invoice balance will update automatically" : "Payment will be recorded standalone"}
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
              Record Payment
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
