"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, MessageCircle, Loader2, Check, X } from "lucide-react";
import { useWhatsAppTemplates } from "@/modules/admin/whatsapp-templates/hooks/useWhatsAppTemplates";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import { WHATSAPP_TEMPLATE_PURPOSES } from "@/lib/constants";
import type {
  WhatsAppTemplate, WhatsAppTemplateFormData, WhatsAppTemplateCategory, WhatsAppTemplateApprovalStatus,
} from "@/modules/admin/whatsapp-templates/types";

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/50 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

const APPROVAL_STYLES: Record<WhatsAppTemplateApprovalStatus, string> = {
  draft:          "bg-muted text-muted-foreground",
  pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected:       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const EMPTY_FORM: WhatsAppTemplateFormData = {
  purpose: "", metaTemplateName: "", language: "en", category: "UTILITY",
  approvalStatus: "draft", bodyPreview: "", variables: [], isActive: true, notes: null,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function WhatsAppTemplatesPanel() {
  const { templates, loading, addTemplate, editTemplate, removeTemplate } = useWhatsAppTemplates();
  const [form, setForm] = useState<WhatsAppTemplateFormData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof WhatsAppTemplateFormData>(key: K, value: WhatsAppTemplateFormData[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(t: WhatsAppTemplate) {
    setEditingId(t.id);
    setForm({
      purpose: t.purpose, metaTemplateName: t.metaTemplateName, language: t.language,
      category: t.category, approvalStatus: t.approvalStatus, bodyPreview: t.bodyPreview,
      variables: t.variables, isActive: t.isActive, notes: t.notes,
    });
    setError(null);
  }

  function cancel() {
    setForm(null);
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!form) return;
    if (!form.purpose.trim() || !form.metaTemplateName.trim()) {
      setError("Purpose and the Meta template name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = editingId ? await editTemplate(editingId, form) : await addTemplate(form);
      if (result.error) { setError(result.error); return; }
      cancel();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: WhatsAppTemplate) {
    if (!confirm(`Delete the WhatsApp template registered for "${t.purpose}"? This only removes it from this app's registry — it doesn't delete the template from Meta.`)) return;
    await removeTemplate(t.id);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">WhatsApp Message Templates</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Outside a 24-hour window since a customer&apos;s last message, Meta requires a pre-approved message template instead of free text. Templates themselves are created and reviewed in Meta&apos;s WhatsApp Manager (1-2 day approval) — register the approved template here afterward so the app knows its exact name/language/variables for a given purpose. Read-only status here doesn&apos;t reflect Meta&apos;s review in real time; update it by hand as templates get approved or rejected.
        </p>
      </div>

      {!form && (
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Register Template
        </button>
      )}

      {form && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {editingId ? "Edit Template" : "Register Template"}
          </p>
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Purpose">
              <input
                list="whatsapp-template-purposes"
                className={inputClass}
                placeholder="e.g. referral_bonus_paid"
                value={form.purpose}
                onChange={e => set("purpose", e.target.value)}
              />
              <datalist id="whatsapp-template-purposes">
                {Object.values(WHATSAPP_TEMPLATE_PURPOSES).map(p => <option key={p} value={p} />)}
              </datalist>
            </Field>
            <Field label="Meta Template Name">
              <input className={inputClass} placeholder="exact name from WhatsApp Manager" value={form.metaTemplateName} onChange={e => set("metaTemplateName", e.target.value)} />
            </Field>
            <Field label="Language Code">
              <input className={inputClass} placeholder="en" value={form.language} onChange={e => set("language", e.target.value)} />
            </Field>
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={e => set("category", e.target.value as WhatsAppTemplateCategory)}>
                <option value="UTILITY">Utility</option>
                <option value="MARKETING">Marketing</option>
                <option value="AUTHENTICATION">Authentication</option>
              </select>
            </Field>
            <Field label="Approval Status">
              <select className={inputClass} value={form.approvalStatus} onChange={e => set("approvalStatus", e.target.value as WhatsAppTemplateApprovalStatus)}>
                <option value="draft">Draft — not submitted yet</option>
                <option value="pending_review">Pending Meta review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
                Active (eligible to be auto-selected for its purpose)
              </label>
            </div>
            <div className="sm:col-span-2">
              <Field label="Approved Wording (reference only — never sent to Meta)">
                <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="Hi {{1}}, your ..." value={form.bodyPreview} onChange={e => set("bodyPreview", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Variables, one per line, in {{1}}, {{2}}... order">
                <textarea
                  rows={3}
                  className={cn(inputClass, "resize-none")}
                  placeholder={"Customer name\nAmount"}
                  value={form.variables.join("\n")}
                  onChange={e => set("variables", e.target.value.split("\n"))}
                />
              </Field>
            </div>
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
              {editingId ? "Save Changes" : "Register"}
            </button>
          </div>
        </div>
      )}

      {loading ? <SkeletonTable rows={4} /> : templates.length === 0 ? (
        <EmptyState title="No templates registered yet" description="Register a template once Meta approves it in WhatsApp Manager" icon={<MessageCircle size={28} className="text-muted-foreground" />} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{t.purpose}</p>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", APPROVAL_STYLES[t.approvalStatus])}>
                    {t.approvalStatus.replace("_", " ")}
                  </span>
                  {!t.isActive && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">inactive</span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {t.metaTemplateName} · {t.language} · {t.category}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button onClick={() => startEdit(t)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(t)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
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
