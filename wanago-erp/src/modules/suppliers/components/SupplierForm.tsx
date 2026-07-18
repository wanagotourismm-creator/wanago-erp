"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Truck, MapPin, StickyNote, FileText } from "lucide-react";
import { supplierSchema, type SupplierSchema } from "@/modules/suppliers/schemas";
import { SUPPLIER_CATEGORIES } from "@/modules/suppliers/components/SupplierBadges";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Supplier } from "@/modules/suppliers/types";

type Props = {
  open:      boolean;
  supplier?: Supplier | null;
  onClose:   () => void;
  onSubmit:  (data: SupplierSchema) => Promise<void>;
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

export function SupplierForm({ open, supplier, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierSchema>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      category:       "Hotel",
      supplierStatus: "active",
      officeId:       user?.officeId   ?? "main",
      officeName:     user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (open) {
      if (supplier) {
        reset({
          ...supplier,
          email:        supplier.email        ?? "",
          address:      supplier.address      ?? "",
          city:         supplier.city         ?? "",
          gstNumber:    supplier.gstNumber    ?? "",
          paymentTerms: supplier.paymentTerms ?? "",
          notes:        supplier.notes        ?? "",
        });
      } else {
        reset({
          category:       "Hotel",
          supplierStatus: "active",
          officeId:       user?.officeId   ?? "main",
          officeName:     user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, supplier, reset, user]);

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
              <Truck size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {supplier ? "Edit Supplier" : "Add New Supplier"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {supplier ? `Editing ${supplier.refNumber}` : "Fill in the details to add a new supplier"}
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

          {/* ── Details ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Truck size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Supplier Information</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <Field label="Supplier Name" required error={errors.name?.message}>
                  <input className={inputClass} placeholder="e.g. Taj Hotels" {...register("name")} />
                </Field>
              </div>
              <Field label="Category" required error={errors.category?.message}>
                <select className={inputClass} {...register("category")}>
                  {SUPPLIER_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status" error={errors.supplierStatus?.message}>
                <select className={inputClass} {...register("supplierStatus")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Contact Person" required error={errors.contactPerson?.message}>
                <input className={inputClass} placeholder="e.g. Rahul Sharma" {...register("contactPerson")} />
              </Field>
              <Field label="Phone" required error={errors.phone?.message}>
                <input className={inputClass} type="tel" placeholder="+91 98765 43210" {...register("phone")} />
              </Field>
              <div className="col-span-2">
                <Field label="Email" error={errors.email?.message}>
                  <input className={inputClass} type="email" placeholder="contact@supplier.com" {...register("email")} />
                </Field>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Address ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Address</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="City" error={errors.city?.message}>
                <input className={inputClass} placeholder="e.g. Mumbai" {...register("city")} />
              </Field>
              <div className="col-span-2">
                <Field label="Address" error={errors.address?.message}>
                  <input className={inputClass} placeholder="Street, area, pincode..." {...register("address")} />
                </Field>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Billing ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Billing</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="GST Number" error={errors.gstNumber?.message}>
                <input className={inputClass} placeholder="e.g. 27AAAAA0000A1Z5" {...register("gstNumber")} />
              </Field>
              <Field label="Payment Terms" error={errors.paymentTerms?.message}>
                <input className={inputClass} placeholder="e.g. Net 30, Advance 50%" {...register("paymentTerms")} />
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
                placeholder="Any preferences, special requirements, or notes..."
                {...register("notes")}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {supplier ? "Changes will be saved immediately" : "Supplier will be added to your directory"}
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
              {supplier ? "Save Changes" : "Add Supplier"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
