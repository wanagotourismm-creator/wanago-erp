"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { CompanySettings } from "@/modules/admin/settings/services/company-settings.service";

type Props = {
  settings: CompanySettings;
  saving:   boolean;
  onSave:   (data: CompanySettings) => Promise<{ error: string | null }>;
};

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function CompanySettingsForm({ settings, saving, onSave }: Props) {
  const [form, setForm] = useState<CompanySettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setForm(settings); }, [settings]);

  function set<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    const result = await onSave(form);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Business Name">
            <input className={inputClass} value={form.businessName} onChange={e => set("businessName", e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <input className={inputClass} type="email" value={form.email} onChange={e => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={inputClass} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Address">
            <input className={inputClass} value={form.address} onChange={e => set("address", e.target.value)} />
          </Field>
        </div>
        <Field label="City">
          <input className={inputClass} value={form.city} onChange={e => set("city", e.target.value)} />
        </Field>
        <Field label="GST Number">
          <input className={inputClass} value={form.gstNumber} onChange={e => set("gstNumber", e.target.value)} />
        </Field>
        <Field label="Currency">
          <select className={inputClass} value={form.currency} onChange={e => set("currency", e.target.value)}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <Check size={13} /> Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
