"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, MapPin, Briefcase, StickyNote } from "lucide-react";
import { customerSchema, type CustomerSchema } from "@/modules/customers/schemas";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { DEFAULT_LEAD_SOURCES } from "@/lib/constants";
import type { Customer } from "@/modules/customers/types";

type Props = {
  open:     boolean;
  customer?: Customer | null;
  onClose:  () => void;
  onSubmit: (data: CustomerSchema) => Promise<void>;
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary focus:ring-0 [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]";

export function CustomerForm({ open, customer, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerSchema>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      country:    "India",
      tags:       [],
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (open) {
      if (customer) {
        reset({
          ...customer,
          email:          customer.email          ?? "",
          alternatePhone: customer.alternatePhone ?? "",
          dateOfBirth:    customer.dateOfBirth    ?? "",
          anniversary:    customer.anniversary    ?? "",
          city:           customer.city           ?? "",
          state:          customer.state          ?? "",
          pincode:        customer.pincode        ?? "",
          assignedTo:     customer.assignedTo     ?? "",
          agentName:      customer.agentName      ?? "",
          source:         customer.source         ?? "",
          notes:          customer.notes          ?? "",
          tags:           customer.tags           ?? [],
        });
      } else {
        reset({
          country:    "India",
          tags:       [],
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, customer, reset, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <User size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {customer ? "Edit Customer" : "Add New Customer"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {customer ? `Editing ${customer.refNumber}` : "Fill in the customer details"}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">

          {/* Contact */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact Information</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Full Name *" error={errors.name?.message}>
                  <input className={inputCls} placeholder="e.g. Rahul Sharma" {...register("name")} />
                </Field>
              </div>
              <Field label="Phone *" error={errors.phone?.message}>
                <input className={inputCls} type="tel" placeholder="+91 98765 43210" {...register("phone")} />
              </Field>
              <Field label="Alternate Phone" error={errors.alternatePhone?.message}>
                <input className={inputCls} type="tel" placeholder="+91 98765 43210" {...register("alternatePhone")} />
              </Field>
              <div className="col-span-2">
                <Field label="Email" error={errors.email?.message}>
                  <input className={inputCls} type="email" placeholder="rahul@example.com" {...register("email")} />
                </Field>
              </div>
              <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
                <input className={inputCls} type="date" {...register("dateOfBirth")} />
              </Field>
              <Field label="Anniversary" error={errors.anniversary?.message}>
                <input className={inputCls} type="date" {...register("anniversary")} />
              </Field>
              <Field label="Gender" error={errors.gender?.message}>
                <select className={inputCls} {...register("gender")}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Source" error={errors.source?.message}>
                <select className={inputCls} {...register("source")}>
                  <option value="">Select source</option>
                  {DEFAULT_LEAD_SOURCES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Address */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Address</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" error={errors.city?.message}>
                <input className={inputCls} placeholder="Mumbai" {...register("city")} />
              </Field>
              <Field label="State" error={errors.state?.message}>
                <input className={inputCls} placeholder="Maharashtra" {...register("state")} />
              </Field>
              <Field label="Country *" error={errors.country?.message}>
                <input className={inputCls} placeholder="India" {...register("country")} />
              </Field>
              <Field label="Pincode" error={errors.pincode?.message}>
                <input className={inputCls} placeholder="400001" {...register("pincode")} />
              </Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Assignment */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Assignment</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Agent Name" error={errors.agentName?.message}>
                <input className={inputCls} placeholder="Agent name" {...register("agentName")} />
              </Field>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <StickyNote size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
            </div>
            <Field label="Additional Notes" error={errors.notes?.message}>
              <textarea rows={3} placeholder="Any preferences, special requirements..." {...register("notes")}
                className={cn(inputCls, "resize-none")} />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {customer ? "Changes will be saved immediately" : "Customer will be added to your database"}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {customer ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
