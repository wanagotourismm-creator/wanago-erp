"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, CalendarRange, Loader2, Check, X, AlertTriangle } from "lucide-react";
import { useVendorAvailability } from "@/modules/vendor-portal/hooks/useVendorAvailability";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { findOverlappingAvailability } from "@/modules/vendor-portal/services/vendor-availability-overlap.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import type { VendorAvailability, VendorAvailabilityFormData } from "@/modules/vendor-portal/types";

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

function emptyForm(supplierId: string): VendorAvailabilityFormData {
  return { supplierId, resourceLabel: "", startDate: "", endDate: "", unitsAvailable: 1, notes: null, submittedByVendor: false };
}

export function VendorAvailabilityTable({ supplierIdFilter, onSupplierIdFilterChange }: {
  supplierIdFilter: string; onSupplierIdFilterChange: (id: string) => void;
}) {
  const { entries, loading, addAvailability, editAvailability, removeAvailability } = useVendorAvailability();
  const { suppliers } = useSuppliers();
  const [form, setForm] = useState<VendorAvailabilityFormData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => supplierIdFilter ? entries.filter((e) => e.supplierId === supplierIdFilter) : entries,
    [entries, supplierIdFilter]
  );

  const overlappingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [a, b] of findOverlappingAvailability(entries)) { ids.add(a.id); ids.add(b.id); }
    return ids;
  }, [entries]);

  function set<K extends keyof VendorAvailabilityFormData>(key: K, value: VendorAvailabilityFormData[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm(supplierIdFilter || suppliers[0]?.id || ""));
    setError(null);
  }

  function startEdit(a: VendorAvailability) {
    setEditingId(a.id);
    setForm({ supplierId: a.supplierId, resourceLabel: a.resourceLabel, startDate: a.startDate, endDate: a.endDate, unitsAvailable: a.unitsAvailable, notes: a.notes, submittedByVendor: a.submittedByVendor });
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
    if (!form.resourceLabel.trim()) { setError("Resource is required."); return; }
    if (!form.startDate || !form.endDate) { setError("Start and end dates are required."); return; }
    if (form.startDate > form.endDate) { setError("Start date must be before the end date."); return; }
    if (!form.unitsAvailable || form.unitsAvailable < 1) { setError("Units available must be at least 1."); return; }
    setSaving(true);
    setError(null);
    try {
      const supplierName = suppliers.find((s) => s.id === form.supplierId)?.name ?? "";
      const result = editingId ? await editAvailability(editingId, form) : await addAvailability({ ...form, supplierName });
      if (result.error) { setError(result.error); return; }
      cancel();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: VendorAvailability) {
    if (!confirm(`Delete availability for "${a.resourceLabel}"?`)) return;
    await removeAvailability(a);
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
            <Plus size={14} /> Add Availability
          </button>
        )}
      </div>

      {form && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{editingId ? "Edit Availability" : "Add Availability"}</p>
          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Supplier">
              <select className={inputClass} value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
                <option value="">Choose a supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Resource">
              <input className={inputClass} placeholder="e.g. Standard Rooms, Innova Fleet" value={form.resourceLabel} onChange={(e) => set("resourceLabel", e.target.value)} />
            </Field>
            <Field label="Start Date">
              <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="End Date">
              <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
            <Field label="Units Available">
              <input type="number" min={1} className={inputClass} value={form.unitsAvailable || ""} onChange={(e) => set("unitsAvailable", Number(e.target.value))} />
            </Field>
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
        <EmptyState title="No availability entries yet" description="Add vendor availability, or share the vendor's link so they can submit their own" icon={<CalendarRange size={28} className="text-muted-foreground" />} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{a.resourceLabel}</p>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", a.submittedByVendor ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {a.submittedByVendor ? "Vendor Submitted" : "Staff Entered"}
                  </span>
                  {overlappingIds.has(a.id) && (
                    <span title="Overlaps with another entry for this resource" className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <AlertTriangle size={10} /> Overlaps
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {a.supplierName} · {a.unitsAvailable} units · {a.startDate} to {a.endDate}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button onClick={() => startEdit(a)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(a)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
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
