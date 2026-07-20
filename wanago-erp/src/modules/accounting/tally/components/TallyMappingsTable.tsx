"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Landmark, Loader2, Check, X } from "lucide-react";
import { useTallyMappings } from "@/modules/accounting/tally/hooks/useTallyMappings";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import type { TallyMapping, TallyMappingFormData } from "@/modules/accounting/tally/types";

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

const EMPTY_FORM: TallyMappingFormData = {
  sourceType: "expense_category", sourceKey: "", tallyLedgerName: "", tallyParentGroup: "Indirect Expenses",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function TallyMappingsTable() {
  const { mappings, loading, addMapping, editMapping, removeMapping } = useTallyMappings();
  const [form, setForm] = useState<TallyMappingFormData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TallyMappingFormData>(key: K, value: TallyMappingFormData[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(m: TallyMapping) {
    setEditingId(m.id);
    setForm({ sourceType: m.sourceType, sourceKey: m.sourceKey, tallyLedgerName: m.tallyLedgerName, tallyParentGroup: m.tallyParentGroup });
    setError(null);
  }

  function cancel() {
    setForm(null);
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!form) return;
    if (!form.sourceKey.trim() || !form.tallyLedgerName.trim() || !form.tallyParentGroup.trim()) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = editingId ? await editMapping(editingId, form) : await addMapping(form);
      if (result.error) { setError(result.error); return; }
      cancel();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: TallyMapping) {
    if (!confirm(`Delete the Tally mapping for "${m.sourceKey}"? Future exports will fall back to using the category name itself until it's remapped.`)) return;
    await removeMapping(m);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Landmark size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Tally Ledger Mappings</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Maps each expense category to a real Tally ledger name/group, plus the five system accounts (Sales, GST, Cash, Bank) the export always needs. Unmapped expense categories still export — they fall back to the category name itself under &quot;Indirect Expenses&quot; — but are flagged after each export so you know what to fix here.
        </p>
      </div>

      {!form && (
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Add Expense Category Mapping
        </button>
      )}

      {form && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {editingId ? "Edit Mapping" : "Add Expense Category Mapping"}
          </p>
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Source (expense category, or a system account name)">
              <input
                className={inputClass}
                placeholder="e.g. Travel"
                value={form.sourceKey}
                disabled={form.sourceType === "system"}
                onChange={e => set("sourceKey", e.target.value)}
              />
            </Field>
            <Field label="Tally Ledger Name">
              <input className={inputClass} placeholder="e.g. Travel Expenses" value={form.tallyLedgerName} onChange={e => set("tallyLedgerName", e.target.value)} />
            </Field>
            <Field label="Tally Parent Group">
              <input className={inputClass} placeholder="e.g. Indirect Expenses" value={form.tallyParentGroup} onChange={e => set("tallyParentGroup", e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={cancel} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editingId ? "Save Changes" : "Add"}
            </button>
          </div>
        </div>
      )}

      {loading ? <SkeletonTable rows={4} /> : mappings.length === 0 ? (
        <EmptyState title="No mappings yet" description="Add a mapping for each expense category" icon={<Landmark size={28} className="text-muted-foreground" />} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {mappings.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{m.sourceKey}</p>
                  {m.sourceType === "system" && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">system</span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {m.tallyLedgerName} · under {m.tallyParentGroup}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button onClick={() => startEdit(m)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Pencil size={13} />
                </button>
                {m.sourceType !== "system" && (
                  <button onClick={() => handleDelete(m)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
