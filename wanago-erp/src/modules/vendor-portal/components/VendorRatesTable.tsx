"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, Tag, Loader2, Check, X } from "lucide-react";
import { useVendorRates } from "@/modules/vendor-portal/hooks/useVendorRates";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import type { VendorRate, VendorRateFormData } from "@/modules/vendor-portal/types";

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

function emptyForm(supplierId: string): VendorRateFormData {
  return { supplierId, serviceName: "", description: null, unit: "", rateAmount: 0, currency: "INR", validFrom: null, validTo: null, notes: null, submittedByVendor: false };
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function VendorRatesTable({ supplierIdFilter, onSupplierIdFilterChange }: {
  supplierIdFilter: string; onSupplierIdFilterChange: (id: string) => void;
}) {
  const { rates, loading, addRate, editRate, removeRate } = useVendorRates();
  const { suppliers } = useSuppliers();
  const [form, setForm] = useState<VendorRateFormData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => supplierIdFilter ? rates.filter((r) => r.supplierId === supplierIdFilter) : rates,
    [rates, supplierIdFilter]
  );

  function set<K extends keyof VendorRateFormData>(key: K, value: VendorRateFormData[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm(supplierIdFilter || suppliers[0]?.id || ""));
    setError(null);
  }

  function startEdit(r: VendorRate) {
    setEditingId(r.id);
    setForm({ supplierId: r.supplierId, serviceName: r.serviceName, description: r.description, unit: r.unit, rateAmount: r.rateAmount, currency: r.currency, validFrom: r.validFrom, validTo: r.validTo, notes: r.notes, submittedByVendor: r.submittedByVendor });
    setError(null);
  }

  function cancel() {
    setForm(null);
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!form) return;
    if (!form.supplierId) { setError("Please choose a supplier."); return; }
    if (!form.serviceName.trim()) { setError("Service name is required."); return; }
    if (!form.unit.trim()) { setError("Unit is required."); return; }
    if (!form.rateAmount || form.rateAmount <= 0) { setError("Rate must be greater than 0."); return; }
    setSaving(true);
    setError(null);
    try {
      const supplierName = suppliers.find((s) => s.id === form.supplierId)?.name ?? "";
      const result = editingId ? await editRate(editingId, form) : await addRate({ ...form, supplierName });
      if (result.error) { setError(result.error); return; }
      cancel();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: VendorRate) {
    if (!confirm(`Delete the rate "${r.serviceName}"?`)) return;
    await removeRate(r);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={supplierIdFilter} onChange={(e) => onSupplierIdFilterChange(e.target.value)}
          className={cn(inputClass, "w-auto")}
        >
          <option value="">All suppliers</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {!form && (
          <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            <Plus size={14} /> Add Rate
          </button>
        )}
      </div>

      {form && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{editingId ? "Edit Rate" : "Add Rate"}</p>
          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Supplier">
              <select className={inputClass} value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
                <option value="">Choose a supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Service Name">
              <input className={inputClass} placeholder="e.g. Deluxe Double Room" value={form.serviceName} onChange={(e) => set("serviceName", e.target.value)} />
            </Field>
            <Field label="Unit">
              <input className={inputClass} placeholder="e.g. per night" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
            </Field>
            <Field label="Rate (₹)">
              <input type="number" min={0} className={inputClass} value={form.rateAmount || ""} onChange={(e) => set("rateAmount", Number(e.target.value))} />
            </Field>
            <Field label="Valid From (optional)">
              <input type="date" className={inputClass} value={form.validFrom ?? ""} onChange={(e) => set("validFrom", e.target.value || null)} />
            </Field>
            <Field label="Valid To (optional)">
              <input type="date" className={inputClass} value={form.validTo ?? ""} onChange={(e) => set("validTo", e.target.value || null)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea rows={2} className={cn(inputClass, "resize-none")} value={form.description ?? ""} onChange={(e) => set("description", e.target.value || null)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea rows={2} className={cn(inputClass, "resize-none")} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={cancel} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <X size={14} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editingId ? "Save Changes" : "Add"}
            </button>
          </div>
        </div>
      )}

      {loading ? <SkeletonTable rows={4} /> : filtered.length === 0 ? (
        <EmptyState title="No rates yet" description="Add a vendor rate, or share the vendor's link so they can submit their own" icon={<Tag size={28} className="text-muted-foreground" />} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{r.serviceName}</p>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", r.submittedByVendor ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {r.submittedByVendor ? "Vendor Submitted" : "Staff Entered"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {r.supplierName} · {formatINR(r.rateAmount)} {r.unit}
                  {(r.validFrom || r.validTo) && ` · Valid ${r.validFrom ?? "—"} to ${r.validTo ?? "—"}`}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button onClick={() => startEdit(r)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(r)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
