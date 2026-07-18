"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Megaphone, Calendar, StickyNote } from "lucide-react";
import { campaignSchema, type CampaignSchema } from "@/modules/campaigns/schemas";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { DEFAULT_LEAD_SOURCES } from "@/lib/constants";
import type { Campaign } from "@/modules/campaigns/types";

type Props = {
  open:     boolean;
  campaign?: Campaign | null;
  onClose:  () => void;
  onSubmit: (data: CampaignSchema) => Promise<void>;
};

const CAMPAIGN_STATUSES: { value: Campaign["campaignStatus"]; label: string }[] = [
  { value: "draft",     label: "Draft"     },
  { value: "active",    label: "Active"    },
  { value: "paused",    label: "Paused"    },
  { value: "completed", label: "Completed" },
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

export function CampaignForm({ open, campaign, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<CampaignSchema>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      campaignStatus: "draft",
      officeId:       user?.officeId   ?? "main",
      officeName:     user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (open) {
      if (campaign) {
        reset({
          ...campaign,
          endDate:      campaign.endDate      ?? "",
          notes:        campaign.notes        ?? "",
          campaignType: campaign.campaignType ?? "",
          budget:       campaign.budget        ?? undefined,
        });
      } else {
        reset({
          campaignStatus: "draft",
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, campaign, reset, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal-enter relative w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Megaphone size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {campaign ? "Edit Campaign" : "Add New Campaign"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {campaign ? `Editing ${campaign.refNumber}` : "Track a new marketing campaign"}
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

          {/* ── Campaign Details ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Campaign Details</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <Field label="Campaign Name" required error={errors.name?.message}>
                  <input className={inputClass} placeholder="e.g. Summer Bali Getaway" {...register("name")} />
                </Field>
              </div>
              <Field label="Channel" required error={errors.channel?.message}>
                <select className={inputClass} {...register("channel")}>
                  <option value="">Select channel</option>
                  {DEFAULT_LEAD_SOURCES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Campaign Type" error={errors.campaignType?.message}>
                <input className={inputClass} placeholder="e.g. Social Media, Print, Email..." {...register("campaignType")} />
              </Field>
              <Field label="Budget (₹)" error={errors.budget?.message}>
                <input className={inputClass} type="number" placeholder="50000" {...register("budget")} />
              </Field>
              <Field label="Status" error={errors.campaignStatus?.message}>
                <select className={inputClass} {...register("campaignStatus")}>
                  {CAMPAIGN_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* ── Schedule ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Schedule</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start Date" required error={errors.startDate?.message}>
                <input className={inputClass} type="date" {...register("startDate")} />
              </Field>
              <Field label="End Date" error={errors.endDate?.message}>
                <input className={inputClass} type="date" {...register("endDate")} />
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
                placeholder="Any special details about this campaign..."
                {...register("notes")}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {campaign ? "Changes will be saved immediately" : "Campaign will be added to your tracker"}
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
              {campaign ? "Save Changes" : "Add Campaign"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
