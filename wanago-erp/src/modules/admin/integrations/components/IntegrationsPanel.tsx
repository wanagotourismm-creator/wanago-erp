"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2, Mail, MessageCircle, Send, Volume2 } from "lucide-react";
import { fetchIntegrationStatus, saveIntegrationSecrets } from "@/modules/admin/integrations/services/integrations.service";
import { cn } from "@/lib/utils/helpers";

// `secret: true` (the default) means write-only — masked input, never
// redisplayed once saved, matching the API's SECRET_FIELDS. `secret:
// false` fields (a from-address, a phone number — not sensitive) come
// back from the server as plain text and are directly visible/editable.
type FieldDef = { key: string; label: string; placeholder: string; secret?: boolean };
type Section = { title: string; icon: React.ElementType; description?: string; fields: FieldDef[] };

// "Ask HR" previously had its own Anthropic/OpenAI key section here — it
// now runs on the same free Gemini/Groq stack as every other AI feature
// (GEMINI_API_KEY/GROQ_API_KEY env vars, no per-feature admin config
// needed), so those fields were removed rather than left as dead UI that
// could tempt someone into paying for a key that does nothing.
const SECTIONS: Section[] = [
  {
    title: "Email (Gmail SMTP)", icon: Send,
    description: "Preferred — sends real email from your own Gmail address, no domain needed. Requires 2-Step Verification turned on for the Gmail account, then an App Password generated at myaccount.google.com/apppasswords.",
    fields: [
      { key: "gmailUser", label: "Gmail Address", placeholder: "wanagotourismm@gmail.com", secret: false },
      { key: "gmailAppPassword", label: "App Password", placeholder: "16-character app password" },
    ],
  },
  {
    title: "Email (Resend)", icon: Mail,
    description: "Fallback — only used if Gmail SMTP above isn't configured. Sending to anyone other than your own address requires verifying a domain at resend.com/domains.",
    fields: [
      { key: "resendApiKey", label: "Resend API Key", placeholder: "re_..." },
      { key: "resendFromEmail", label: "From Address", placeholder: "Wanago HR <hr@yourdomain.com>", secret: false },
    ],
  },
  {
    title: "Training Voiceover (Google Cloud TTS)", icon: Volume2,
    description: "Powers auto-read-aloud narration on Onboarding Training steps, in English and Malayalam. Get a key at console.cloud.google.com → APIs & Services → Credentials, with the Cloud Text-to-Speech API enabled. Free tier covers roughly the first 1M characters/month for most voice types; without a key, training falls back to text-only.",
    fields: [
      { key: "googleTtsApiKey", label: "Google Cloud TTS API Key", placeholder: "AIza..." },
    ],
  },
  {
    title: "WhatsApp (Meta Cloud API)", icon: MessageCircle,
    description: "Direct Meta integration — no Twilio markup, and replies within 24h of a customer's last message are free. Set up a WhatsApp Business App at developers.facebook.com, verify a phone number, and generate a permanent System User access token. Register /api/whatsapp/webhook as the webhook URL in Meta's dashboard — the Verify Token below must match what you enter there.",
    fields: [
      { key: "metaWhatsappAccessToken", label: "Access Token", placeholder: "EAAG..." },
      { key: "metaWhatsappPhoneNumberId", label: "Phone Number ID", placeholder: "1234567890", secret: false },
      { key: "metaWhatsappVerifyToken", label: "Webhook Verify Token", placeholder: "choose any string" },
      { key: "metaWhatsappAppSecret", label: "App Secret", placeholder: "used to verify inbound webhook signatures" },
    ],
  },
];

const PLAIN_FIELD_KEYS = new Set(
  SECTIONS.flatMap((s) => s.fields).filter((f) => f.secret === false).map((f) => f.key)
);

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/50 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function IntegrationsPanel() {
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  // The last-known-saved value for plain (non-secret) fields — used to
  // tell an actual edit apart from the pre-filled value on load, and to
  // restore the display after saving (draft otherwise resets to empty).
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchIntegrationStatus()
      .then(({ configured, values }) => {
        setConfigured(configured);
        setInitialValues(values);
        // Pre-fill plain (non-secret) fields with their real current value
        // so they show up as actually configured, not blank — secrets are
        // never returned by the server, so draft stays empty for those
        // until the admin types a new one.
        setDraft((prev) => ({ ...values, ...prev }));
      })
      .catch(() => setError("Couldn't load integration status"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const patch: Record<string, string> = {};
      const clear: string[] = [];
      for (const [k, v] of Object.entries(draft)) {
        const trimmed = v.trim();
        if (trimmed.length > 0 && trimmed !== initialValues[k]) {
          patch[k] = trimmed;
        } else if (trimmed.length === 0 && PLAIN_FIELD_KEYS.has(k) && initialValues[k]) {
          // A plain field that was previously set and is now blank means
          // "remove this," not "no change" — secrets can't express this
          // (they're never round-tripped, so a blank one is ambiguous and
          // is left alone, same as before).
          clear.push(k);
        }
      }
      if (Object.keys(patch).length === 0 && clear.length === 0) return;

      await saveIntegrationSecrets(patch, clear);

      const nextConfigured = { ...configured };
      for (const k of Object.keys(patch)) nextConfigured[k] = true;
      for (const k of clear) nextConfigured[k] = false;
      setConfigured(nextConfigured);

      // Only plain fields' new values stick around client-side — a
      // freshly-typed secret is sent once and then dropped from state,
      // same as the original write-only behavior.
      const plainPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => PLAIN_FIELD_KEYS.has(k)));
      const nextInitial = { ...initialValues, ...plainPatch };
      for (const k of clear) delete nextInitial[k];
      setInitialValues(nextInitial);
      setDraft(nextInitial);
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

  // A plain field pre-filled from the server shouldn't count as "changed"
  // by itself — only an actual edit (a new value, or clearing one that was
  // previously set) counts.
  const hasDraft = Object.entries(draft).some(([k, v]) => {
    const trimmed = v.trim();
    if (trimmed.length > 0) return trimmed !== initialValues[k];
    return PLAIN_FIELD_KEYS.has(k) && !!initialValues[k];
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Integrations</p>
        </div>
        <p className="text-xs text-muted-foreground">
          API keys and tokens are write-only — once saved they&apos;re never displayed again, only whether each is configured. Non-secret fields (like a from-address or phone number) show their current value and can be edited directly. Leave a field blank to keep its current value.
        </p>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
      {saved && <div className="rounded-xl border border-green-300/40 bg-green-50 dark:bg-green-900/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">Saved.</div>}

      {SECTIONS.map((section) => (
        <div key={section.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <section.icon size={14} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">{section.title}</p>
          </div>
          {section.description && (
            <p className="mb-4 pl-10 text-xs text-muted-foreground">{section.description}</p>
          )}
          <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", !section.description && "mt-4")}>
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
                  type={f.secret === false ? "text" : "password"}
                  autoComplete="off"
                  className={inputClass}
                  placeholder={f.secret === false || !configured[f.key] ? f.placeholder : "•••••••• (leave blank to keep)"}
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
