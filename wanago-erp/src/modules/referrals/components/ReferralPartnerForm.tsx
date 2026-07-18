"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, UserPlus } from "lucide-react";
import { referralPartnerSchema, type ReferralPartnerSchema } from "@/modules/referrals/schemas/partner.schema";
import { cn } from "@/lib/utils/helpers";
import type { ReferralPartner } from "@/modules/referrals/types";

type Props = {
  open: boolean;
  partner?: ReferralPartner | null;
  onClose: () => void;
  onSubmit: (data: ReferralPartnerSchema) => Promise<void>;
};

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function ReferralPartnerForm({ open, partner, onClose, onSubmit }: Props) {
  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<ReferralPartnerSchema>({
    resolver: zodResolver(referralPartnerSchema),
    defaultValues: { payoutMethod: "upi", partnerStatus: "active" },
  });

  useEffect(() => {
    if (open) {
      if (partner) {
        reset({
          ...partner,
          email: partner.email ?? "",
          upiId: partner.upiId ?? "",
          bankAccountName: partner.bankAccountName ?? "",
          bankAccountNumber: partner.bankAccountNumber ?? "",
          bankIfscCode: partner.bankIfscCode ?? "",
          notes: partner.notes ?? "",
        });
      } else {
        reset({ payoutMethod: "upi", partnerStatus: "active" });
      }
    }
  }, [open, partner, reset]);

  const payoutMethod = watch("payoutMethod");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <UserPlus size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{partner ? "Edit Referral Executive" : "Add Referral Executive"}</h2>
              <p className="text-xs text-muted-foreground">{partner ? `Editing ${partner.refNumber}` : "A freelance partner who refers customers for a bonus"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" required error={errors.fullName?.message}>
              <input className={inputClass} placeholder="e.g. Anoop Menon" {...register("fullName")} />
            </Field>
            <Field label="Phone" required error={errors.phone?.message}>
              <input className={inputClass} placeholder="9876543210" {...register("phone")} />
            </Field>
            <div className="col-span-2">
              <Field label="Email" error={errors.email?.message}>
                <input className={inputClass} placeholder="anoop@example.com" {...register("email")} />
              </Field>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Payout Details</p>
            <Field label="Payout Method" required>
              <select className={inputClass} {...register("payoutMethod")}>
                <option value="upi">UPI</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </Field>
            {payoutMethod === "upi" ? (
              <div className="mt-4">
                <Field label="UPI ID" error={errors.upiId?.message}>
                  <input className={inputClass} placeholder="name@okhdfcbank" {...register("upiId")} />
                </Field>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="col-span-2">
                  <Field label="Account Holder Name" error={errors.bankAccountName?.message}>
                    <input className={inputClass} {...register("bankAccountName")} />
                  </Field>
                </div>
                <Field label="Account Number" error={errors.bankAccountNumber?.message}>
                  <input className={inputClass} {...register("bankAccountNumber")} />
                </Field>
                <Field label="IFSC Code" error={errors.bankIfscCode?.message}>
                  <input className={inputClass} {...register("bankIfscCode")} />
                </Field>
              </div>
            )}
          </div>

          <Field label="Status">
            <select className={inputClass} {...register("partnerStatus")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <Field label="Notes">
            <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="How they were recruited, etc." {...register("notes")} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {partner ? "Save Changes" : "Add Executive"}
          </button>
        </div>

      </div>
    </div>
  );
}
