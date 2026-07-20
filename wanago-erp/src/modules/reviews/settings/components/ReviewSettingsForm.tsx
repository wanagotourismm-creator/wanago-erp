"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { ReviewSettings } from "@/modules/reviews/settings/types";

type Props = {
  settings: ReviewSettings;
  saving:   boolean;
  onSave:   (data: ReviewSettings) => Promise<{ error: string | null }>;
};

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function ReviewSettingsForm({ settings, saving, onSave }: Props) {
  const [form, setForm] = useState<ReviewSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setForm(settings); }, [settings]);

  function set<K extends keyof ReviewSettings>(key: K, value: ReviewSettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function validate(): string | null {
    if (!Number.isFinite(form.delayDays) || form.delayDays < 0) return "Delay must be 0 or more days.";
    if (!Number.isInteger(form.promoterThreshold) || form.promoterThreshold < 0 || form.promoterThreshold > 10) {
      return "Promoter threshold must be an NPS score between 0 and 10.";
    }
    if (!Number.isInteger(form.detractorThreshold) || form.detractorThreshold < 0 || form.detractorThreshold > 10) {
      return "Detractor threshold must be an NPS score between 0 and 10.";
    }
    if (form.detractorThreshold >= form.promoterThreshold) {
      return "Detractor threshold must be lower than the promoter threshold.";
    }
    return null;
  }

  async function handleSave() {
    setError(null);
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    const result = await onSave(form);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Review & NPS Engine</p>
          <p className="text-xs text-muted-foreground">
            Controls when the post-trip review request goes out and how responses are classified.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Send delay (days after trip completion)">
            <input
              type="number" min={0} className={inputClass}
              value={form.delayDays}
              onChange={(e) => set("delayDays", Number(e.target.value))}
            />
          </Field>
          <Field label="Google review link (shown to promoters)">
            <input
              type="url" placeholder="https://g.page/r/..." className={inputClass}
              value={form.googleReviewUrl ?? ""}
              onChange={(e) => set("googleReviewUrl", e.target.value || null)}
            />
          </Field>
          <Field label="Promoter threshold (score ≥ this = promoter)">
            <input
              type="number" min={0} max={10} className={inputClass}
              value={form.promoterThreshold}
              onChange={(e) => set("promoterThreshold", Number(e.target.value))}
            />
          </Field>
          <Field label="Detractor threshold (score ≤ this = detractor)">
            <input
              type="number" min={0} max={10} className={inputClass}
              value={form.detractorThreshold}
              onChange={(e) => set("detractorThreshold", Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
        {saved ? "Saved" : "Save Settings"}
      </button>
    </div>
  );
}
