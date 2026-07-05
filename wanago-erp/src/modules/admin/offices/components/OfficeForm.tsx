"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Building2, LocateFixed } from "lucide-react";
import { officeSchema, type OfficeSchema } from "@/modules/admin/offices/schemas";
import { getCurrentPosition } from "@/lib/geo";
import { cn } from "@/lib/utils/helpers";
import type { Office } from "@/modules/admin/offices/types";

type Props = {
  open:    boolean;
  office?: Office | null;
  onClose: () => void;
  onSubmit: (data: OfficeSchema) => Promise<void>;
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

export function OfficeForm({ open, office, onClose, onSubmit }: Props) {
  const [locating, setLocating] = useState(false);
  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<OfficeSchema>({
    resolver: zodResolver(officeSchema),
    defaultValues: { isHeadOffice: false },
  });

  useEffect(() => {
    if (open) {
      if (office) {
        reset({
          ...office,
          address: office.address ?? "",
          city:    office.city    ?? "",
          phone:   office.phone   ?? "",
          latitude:             office.latitude             ?? undefined,
          longitude:            office.longitude            ?? undefined,
          geofenceRadiusMeters: office.geofenceRadiusMeters  ?? undefined,
        });
      } else {
        reset({ isHeadOffice: false });
      }
    }
  }, [open, office, reset]);

  async function handleUseMyLocation() {
    setLocating(true);
    const pos = await getCurrentPosition();
    setLocating(false);
    if (!pos) { alert("Couldn't get your location. Check browser location permissions."); return; }
    setValue("latitude", pos.lat);
    setValue("longitude", pos.lng);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Building2 size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{office ? "Edit Office" : "Add Office"}</h2>
              <p className="text-xs text-muted-foreground">{office ? `Editing ${office.name}` : "Add a new branch/office"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Office Name" required error={errors.name?.message}>
                <input className={inputClass} placeholder="e.g. Mumbai Branch" {...register("name")} />
              </Field>
            </div>
            <Field label="Office Code" required error={errors.code?.message}>
              <input className={inputClass} placeholder="e.g. MUM" {...register("code")} />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <input className={inputClass} placeholder="e.g. Mumbai" {...register("city")} />
            </Field>
            <div className="col-span-2">
              <Field label="Address" error={errors.address?.message}>
                <input className={inputClass} placeholder="Street, area, pincode..." {...register("address")} />
              </Field>
            </div>
            <Field label="Phone" error={errors.phone?.message}>
              <input className={inputClass} type="tel" placeholder="+91 98765 43210" {...register("phone")} />
            </Field>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-input" {...register("isHeadOffice")} />
                Head Office
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Geofenced Attendance (optional)</p>
              <button type="button" onClick={handleUseMyLocation} disabled={locating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted disabled:opacity-60 transition-colors">
                {locating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
                Use My Location
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Set coordinates to flag clock-ins made outside this radius. Leave blank to skip location checks for this office.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Latitude">
                <input className={inputClass} type="number" step="any" {...register("latitude", { valueAsNumber: true })} />
              </Field>
              <Field label="Longitude">
                <input className={inputClass} type="number" step="any" {...register("longitude", { valueAsNumber: true })} />
              </Field>
              <Field label="Radius (meters)">
                <input className={inputClass} type="number" step="1" placeholder="e.g. 200" {...register("geofenceRadiusMeters", { valueAsNumber: true })} />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {office ? "Save Changes" : "Add Office"}
          </button>
        </div>

      </div>
    </div>
  );
}
