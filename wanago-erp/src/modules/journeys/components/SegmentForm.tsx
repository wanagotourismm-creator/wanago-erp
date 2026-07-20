"use client";

import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { Segment, SegmentFormData, SegmentEntityType } from "@/modules/journeys/types";
import type { CustomerSegment } from "@/modules/customers/utils/segment";

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const EMPTY_FORM: SegmentFormData = { name: "", entityType: "both", filters: {} };
const CUSTOMER_SEGMENTS: CustomerSegment[] = ["new", "repeat", "vip", "dormant"];

export function SegmentForm({
  segment, saving, onSave, onCancel,
}: {
  segment: Segment | null;
  saving: boolean;
  onSave: (data: SegmentFormData) => Promise<{ error: string | null }>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SegmentFormData>(
    segment ? { name: segment.name, entityType: segment.entityType, filters: segment.filters } : EMPTY_FORM
  );
  const [error, setError] = useState<string | null>(null);

  function toCsv(values?: string[]): string { return (values ?? []).join(", "); }
  function fromCsv(value: string): string[] { return value.split(",").map((v) => v.trim()).filter(Boolean); }

  function toggleCustomerSegment(seg: CustomerSegment) {
    const current = form.filters.customerSegmentIn ?? [];
    const next = current.includes(seg) ? current.filter((s) => s !== seg) : [...current, seg];
    setForm({ ...form, filters: { ...form.filters, customerSegmentIn: next } });
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setError(null);
    const result = await onSave(form);
    if (result.error) setError(result.error);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{segment ? "Edit Segment" : "New Segment"}</p>
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kerala-bound leads" />
        </Field>
        <Field label="Applies to">
          <select className={inputClass} value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value as SegmentEntityType })}>
            <option value="both">Leads + Customers</option>
            <option value="lead">Leads only</option>
            <option value="customer">Customers only</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Destinations (leads only, comma-separated)">
            <input
              className={inputClass} placeholder="e.g. Wayanad, Munnar"
              value={toCsv(form.filters.destinationIn)}
              onChange={(e) => setForm({ ...form, filters: { ...form.filters, destinationIn: fromCsv(e.target.value) } })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Sources (comma-separated)">
            <input
              className={inputClass} placeholder="e.g. Instagram, Referral"
              value={toCsv(form.filters.sourceIn)}
              onChange={(e) => setForm({ ...form, filters: { ...form.filters, sourceIn: fromCsv(e.target.value) } })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="City/address contains (customers only — rough regional proxy, not a real region field)">
            <input
              className={inputClass} placeholder="e.g. Dubai"
              value={form.filters.cityContains ?? ""}
              onChange={(e) => setForm({ ...form, filters: { ...form.filters, cityContains: e.target.value || null } })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer segment (customers only)</label>
          <div className="flex flex-wrap gap-3">
            {CUSTOMER_SEGMENTS.map((seg) => (
              <label key={seg} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer capitalize">
                <input
                  type="checkbox" className="h-4 w-4 rounded border-input"
                  checked={(form.filters.customerSegmentIn ?? []).includes(seg)}
                  onChange={() => toggleCustomerSegment(seg)}
                />
                {seg}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <X size={14} /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {segment ? "Save Changes" : "Create"}
        </button>
      </div>
    </div>
  );
}
