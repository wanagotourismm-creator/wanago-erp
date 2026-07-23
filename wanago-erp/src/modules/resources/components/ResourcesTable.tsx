"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Truck, Loader2, Check, X } from "lucide-react";
import { useResources } from "@/modules/resources/hooks/useResources";
import { useAuthStore } from "@/store/auth.store";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import type { Resource, ResourceFormData, ResourceType } from "@/modules/resources/types";

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

const TYPE_LABELS: Record<ResourceType, string> = {
  vehicle: "Vehicle", driver: "Driver", guide: "Guide", room_block: "Room Block",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function emptyForm(officeId: string, officeName: string): ResourceFormData {
  return { name: "", type: "vehicle", capacity: 1, officeId, officeName, supplierId: null, phone: null, notes: null, isActive: true };
}

export function ResourcesTable() {
  const { user } = useAuthStore();
  const { resources, loading, addResource, editResource, removeResource } = useResources();
  const [form, setForm] = useState<ResourceFormData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ResourceFormData>(key: K, value: ResourceFormData[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm(user?.officeId ?? "main", user?.officeName ?? "Head Office"));
    setError(null);
  }

  function startEdit(r: Resource) {
    setEditingId(r.id);
    setForm({ name: r.name, type: r.type, capacity: r.capacity, officeId: r.officeId, officeName: r.officeName, supplierId: r.supplierId, phone: r.phone, notes: r.notes, isActive: r.isActive });
    setError(null);
  }

  function cancel() {
    setForm(null);
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.capacity || form.capacity < 1) { setError("Capacity must be at least 1."); return; }
    setSaving(true);
    setError(null);
    try {
      const result = editingId ? await editResource(editingId, form) : await addResource(form);
      if (result.error) { setError(result.error); return; }
      cancel();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: Resource) {
    if (!confirm(`Delete "${r.name}"? Existing assignments/blackouts referencing it will remain but the resource itself will disappear from the registry.`)) return;
    await removeResource(r);
  }

  return (
    <div className="space-y-5">
      {!form && (
        <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Add Resource
        </button>
      )}

      {form && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{editingId ? "Edit Resource" : "Add Resource"}</p>
          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputClass} placeholder="e.g. Innova KL-11-AB-1234" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Type">
              <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value as ResourceType)}>
                <option value="vehicle">Vehicle</option>
                <option value="driver">Driver</option>
                <option value="guide">Guide</option>
                <option value="room_block">Room Block</option>
              </select>
            </Field>
            <Field label="Capacity">
              <input type="number" min={1} className={inputClass} value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
            </Field>
            <Field label="Phone (driver/guide contact)">
              <input type="tel" className={inputClass} placeholder="+91 98765 43210" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} />
            </Field>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                Active
              </label>
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

      {loading ? <SkeletonTable rows={4} /> : resources.length === 0 ? (
        <EmptyState title="No resources yet" description="Add a vehicle, driver, guide, or room block" icon={<Truck size={28} className="text-muted-foreground" />} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  {!r.isActive && <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">inactive</span>}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {TYPE_LABELS[r.type]} · Capacity {r.capacity} · {r.officeName}
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
