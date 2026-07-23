"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Package as PackageIcon, MapPin, IndianRupee, StickyNote, Tag } from "lucide-react";
import { packageSchema, type PackageSchema } from "@/modules/packages/schemas";
import { VendorRatePicker } from "@/modules/vendor-portal/components/VendorRatePicker";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Package } from "@/modules/packages/types";
import type { VendorRate } from "@/modules/vendor-portal/types";

type Props = {
  open:    boolean;
  pkg?:    Package | null;
  onClose: () => void;
  onSubmit: (data: PackageSchema) => Promise<void>;
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

export function PackageForm({ open, pkg, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();

  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<PackageSchema>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      durationDays:   0,
      durationNights: 0,
      basePrice:      0,
      costPrice:      0,
      packageStatus:  "active",
      officeId:       user?.officeId   ?? "main",
      officeName:     user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (open) {
      if (pkg) {
        reset({
          ...pkg,
          inclusions: pkg.inclusions ?? "",
          exclusions: pkg.exclusions ?? "",
          validFrom:  pkg.validFrom  ?? "",
          validTo:    pkg.validTo    ?? "",
          notes:      pkg.notes      ?? "",
        });
      } else {
        reset({
          durationDays: 0, durationNights: 0, basePrice: 0, costPrice: 0,
          packageStatus: "active",
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, pkg, reset, user]);

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
              <PackageIcon size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {pkg ? "Edit Package" : "Add New Package"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {pkg ? `Editing ${pkg.refNumber}` : "Add a new package to your catalog"}
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

          {/* ── Overview ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PackageIcon size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Overview</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <Field label="Title" required error={errors.title?.message}>
                  <input className={inputClass} placeholder="e.g. Maldives Honeymoon Special" {...register("title")} />
                </Field>
              </div>
              <Field label="Destination" required error={errors.destination?.message}>
                <input className={inputClass} placeholder="e.g. Maldives, Bali, Europe..." {...register("destination")} />
              </Field>
              <Field label="Category" required error={errors.category?.message}>
                <input className={inputClass} placeholder="e.g. Honeymoon, Family, Adventure..." {...register("category")} />
              </Field>
              <Field label="Status" error={errors.packageStatus?.message}>
                <select className={inputClass} {...register("packageStatus")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Trip Details ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Duration (Days)" error={errors.durationDays?.message}>
                <input className={inputClass} type="number" min={0} placeholder="5" {...register("durationDays")} />
              </Field>
              <Field label="Duration (Nights)" error={errors.durationNights?.message}>
                <input className={inputClass} type="number" min={0} placeholder="4" {...register("durationNights")} />
              </Field>
              <Field label="Valid From" error={errors.validFrom?.message}>
                <input className={inputClass} type="date" {...register("validFrom")} />
              </Field>
              <Field label="Valid To" error={errors.validTo?.message}>
                <input className={inputClass} type="date" {...register("validTo")} />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Pricing ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <IndianRupee size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Pricing</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Base Price (₹)" error={errors.basePrice?.message}>
                <input className={inputClass} type="number" min={0} placeholder="50000" {...register("basePrice")} />
              </Field>
              <Field label="Cost Price (₹)" error={errors.costPrice?.message}>
                <input className={inputClass} type="number" min={0} placeholder="35000" {...register("costPrice")} />
              </Field>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Cost Price is what this package costs the company — it seeds the profit figure Operations confirms on each booking.
              </p>
              <button
                type="button"
                onClick={() => setVendorPickerOpen(true)}
                className="inline-flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Tag size={12} /> Look up Vendor Rate
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Fills in a single vendor&apos;s rate — adjust for the package&apos;s full cost if it covers more than this one line.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Details ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <StickyNote size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Details</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Inclusions" error={errors.inclusions?.message}>
                <textarea
                  rows={3}
                  placeholder="What's included in this package..."
                  {...register("inclusions")}
                  className={cn(inputClass, "resize-none")}
                />
              </Field>
              <Field label="Exclusions" error={errors.exclusions?.message}>
                <textarea
                  rows={3}
                  placeholder="What's not included in this package..."
                  {...register("exclusions")}
                  className={cn(inputClass, "resize-none")}
                />
              </Field>
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

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {pkg ? "Changes will be saved immediately" : "Package will be added to your catalog"}
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
              {pkg ? "Save Changes" : "Add Package"}
            </button>
          </div>
        </div>

      </div>

      <VendorRatePicker
        open={vendorPickerOpen}
        onClose={() => setVendorPickerOpen(false)}
        onSelect={(rate: VendorRate) => setValue("costPrice", rate.rateAmount)}
      />
    </div>
  );
}
