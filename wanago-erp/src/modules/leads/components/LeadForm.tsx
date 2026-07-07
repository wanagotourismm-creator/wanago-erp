"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, MapPin, BarChart2, StickyNote } from "lucide-react";
import { leadSchema, type LeadSchema } from "@/modules/leads/schemas";
import { useAuthStore } from "@/store/auth.store";
import { SalesAgentSelect } from "@/components/shared/SalesAgentSelect";
import { cn } from "@/lib/utils/helpers";
import {
  LEAD_STAGE_LABELS, DEFAULT_LEAD_SOURCES, TRIP_TYPES,
} from "@/lib/constants";
import type { Lead } from "@/modules/leads/types";

type Props = {
  open:     boolean;
  lead?:    Lead | null;
  onClose:  () => void;
  onSubmit: (data: LeadSchema) => Promise<void>;
};

const PRIORITIES = [
  { value: "hot",  label: "🔥 Hot",  color: "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"   },
  { value: "warm", label: "☀️ Warm", color: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  { value: "cold", label: "❄️ Cold", color: "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"  },
];

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

export function LeadForm({ open, lead, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadSchema>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      stage:      "new",
      priority:   "warm",
      pax:        1,
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    },
  });

  const selectedPriority = watch("priority");

  useEffect(() => {
    if (open) {
      if (lead) {
        reset({
          ...lead,
          email:           lead.email           ?? "",
          alternatePhone:  lead.alternatePhone  ?? "",
          notes:           lead.notes           ?? "",
          assignedTo:      lead.assignedTo      ?? "",
          agentName:       lead.agentName       ?? "",
          travelDate:      lead.travelDate      ?? "",
          returnDate:      lead.returnDate      ?? "",
          tripType:        lead.tripType        ?? "",
          source:          lead.source          ?? "",
          pax:             lead.pax             ?? undefined,
          isSelfGenerated: lead.isSelfGenerated ?? false,
        });
      } else {
        reset({
          stage: "new", priority: "warm", pax: 1,
          officeId:        user?.officeId   ?? "main",
          officeName:      user?.officeName ?? "Head Office",
          isSelfGenerated: false,
        });
      }
    }
  }, [open, lead, reset, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

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
                {lead ? "Edit Lead" : "Add New Lead"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {lead ? `Editing ${lead.refNumber}` : "Only Name, Phone & Destination are required — add the rest after your call"}
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

          {/* ── Contact ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact Information</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <Field label="Full Name" required error={errors.name?.message}>
                  <input className={inputClass} placeholder="e.g. Rahul Sharma" {...register("name")} />
                </Field>
              </div>
              <Field label="Phone" required error={errors.phone?.message}>
                <input className={inputClass} type="tel" placeholder="+91 98765 43210" {...register("phone")} />
              </Field>
              <Field label="Alternate Phone" error={errors.alternatePhone?.message}>
                <input className={inputClass} type="tel" placeholder="+91 98765 43210" {...register("alternatePhone")} />
              </Field>
              <div className="col-span-2">
                <Field label="Email" error={errors.email?.message}>
                  <input className={inputClass} type="email" placeholder="rahul@example.com" {...register("email")} />
                </Field>
              </div>
            </div>
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
              <Field label="Trip Type" error={errors.tripType?.message}>
                <select className={inputClass} {...register("tripType")}>
                  <option value="">Select type</option>
                  {Object.entries(TRIP_TYPES).map(([k, v]) => (
                    <option key={k} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="No. of Pax" error={errors.pax?.message}>
                <input className={inputClass} type="number" min={1} placeholder="2" {...register("pax")} />
              </Field>
              <Field label="Travel Date" error={errors.travelDate?.message}>
                <input className={inputClass} type="date" {...register("travelDate")} />
              </Field>
              <Field label="Return Date" error={errors.returnDate?.message}>
                <input className={inputClass} type="date" {...register("returnDate")} />
              </Field>
              <Field label="Duration (nights)" error={errors.duration?.message}>
                <input className={inputClass} type="number" min={1} placeholder="7" {...register("duration")} />
              </Field>
              <Field label="Budget (₹)" error={errors.budget?.message}>
                <input className={inputClass} type="number" placeholder="50000" {...register("budget")} />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Pipeline ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Pipeline</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Stage" error={errors.stage?.message}>
                <select className={inputClass} {...register("stage")}>
                  {Object.entries(LEAD_STAGE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source" error={errors.source?.message}>
                <select className={inputClass} {...register("source")}>
                  <option value="">Select source</option>
                  {DEFAULT_LEAD_SOURCES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              {/* Priority — visual selector */}
              <div className="col-span-2">
                <Field label="Priority" error={errors.priority?.message}>
                  <div className="flex gap-2">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setValue("priority", p.value)}
                        className={cn(
                          "flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all",
                          selectedPriority === p.value
                            ? p.color + " scale-105 shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="col-span-2">
                <Field label="Assigned To" error={errors.agentName?.message}>
                  <SalesAgentSelect
                    value={watch("assignedTo")}
                    onChange={(id, name) => {
                      setValue("assignedTo", id);
                      setValue("agentName", name);
                    }}
                  />
                </Field>
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={watch("isSelfGenerated") ?? false}
                    onChange={e => setValue("isSelfGenerated", e.target.checked)}
                  />
                  Self-generated lead (sourced directly by me, not assigned)
                </label>
              </div>
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
            {lead ? "Changes will be saved immediately" : "Lead will be added to your pipeline"}
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
              {lead ? "Save Changes" : "Add Lead"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
