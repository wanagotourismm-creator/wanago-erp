"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/Button";
import type { PaymentBreakdown } from "@/modules/tour-operations/types";

export const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

// Every tab section is its own independently-saved card — the ops team
// fills this record in over days/weeks, so a single giant submit button
// for the whole trip would lose work and make partial progress invisible.
export function SectionCard({
  title, icon, children, onSave,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{title}</p>
      </div>
      {children}
      <div className="flex items-center justify-end gap-2 pt-1">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <Check size={13} /> Saved
          </span>
        )}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

export function PaymentFields({
  value, onChange,
}: {
  value:    PaymentBreakdown;
  onChange: (next: PaymentBreakdown) => void;
}) {
  const balance = value.totalCost - value.bookingPayment;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Field label="Total Cost (₹)">
        <input
          type="number" min={0} className={inputClass}
          value={value.totalCost}
          onChange={(e) => onChange({ ...value, totalCost: Number(e.target.value) })}
        />
      </Field>
      <Field label="Booking Payment (₹)">
        <input
          type="number" min={0} className={inputClass}
          value={value.bookingPayment}
          onChange={(e) => onChange({ ...value, bookingPayment: Number(e.target.value) })}
        />
      </Field>
      <Field label="Balance Payment (₹)">
        <input type="number" readOnly disabled className={cn(inputClass, "opacity-70")} value={balance} />
      </Field>
    </div>
  );
}
