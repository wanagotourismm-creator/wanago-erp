"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2, Sparkles, Mail, MessageCircle } from "lucide-react";
import { fetchIntegrationStatus, saveIntegrationSecrets } from "@/modules/admin/integrations/services/integrations.service";
import { cn } from "@/lib/utils/helpers";

type FieldDef = { key: string; label: string; placeholder: string };
type Section = { title: string; icon: React.ElementType; fields: FieldDef[] };

const SECTIONS: Section[] = [
  {
    title: "AI Assistant (Ask HR)", icon: Sparkles,
    fields: [
      { key: "anthropicApiKey", label: "Anthropic API Key", placeholder: "sk-ant-..." },
      { key: "openaiApiKey", label: "OpenAI API Key", placeholder: "sk-..." },
    ],
  },
  {
    title: "Email (Resend)", icon: Mail,
    fields: [
      { key: "resendApiKey", label: "Resend API Key", placeholder: "re_..." },
      { key: "resendFromEmail", label: "From Address", placeholder: "Wanago HR <hr@yourdomain.com>" },
    ],
  },
  {
    title: "WhatsApp (Twilio)", icon: MessageCircle,
    fields: [
      { key: "twilioAccountSid", label: "Account SID", placeholder: "AC..." },
      { key: "twilioAuthToken", label: "Auth Token", placeholder: "•••••••••" },
      { key: "twilioWhatsappNumber", label: "WhatsApp Number", placeholder: "+14155238886" },
    ],
  },
];

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/50 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function IntegrationsPanel() {
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchIntegrationStatus()
      .then(setConfigured)
      .catch(() => setError("Couldn't load integration status"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const patch = Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim().length > 0));
      if (Object.keys(patch).length === 0) return;
      await saveIntegrationSecrets(patch);
      const next = { ...configured };
      for (const k of Object.keys(patch)) next[k] = true;
      setConfigured(next);
      setDraft({});
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  const hasDraft = Object.values(draft).some((v) => v.trim().length > 0);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Integrations</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Keys are write-only — once saved they&apos;re never displayed again, only whether each is configured. Leave a field blank to keep its current value.
        </p>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
      {saved && <div className="rounded-xl border border-green-300/40 bg-green-50 dark:bg-green-900/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">Saved.</div>}

      {SECTIONS.map((section) => (
        <div key={section.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <section.icon size={14} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">{section.title}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {f.label}
                  {configured[f.key] && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                      <Check size={9} /> Configured
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  className={inputClass}
                  placeholder={configured[f.key] ? "•••••••• (leave blank to keep)" : f.placeholder}
                  value={draft[f.key] ?? ""}
                  onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || !hasDraft}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
