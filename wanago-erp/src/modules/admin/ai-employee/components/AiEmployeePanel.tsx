"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Check, Bot, Power, GitPullRequest, ShieldAlert, MessageCircle, Sunrise } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { AiSettings } from "@/modules/ai-core/types";

type Props = {
  settings: AiSettings;
  saving:   boolean;
  onSave:   (data: AiSettings) => Promise<{ error: string | null }>;
};

export function AiEmployeePanel({ settings, saving, onSave }: Props) {
  const [form, setForm] = useState<AiSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setForm(settings); }, [settings]);

  function set<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    <div className="max-w-2xl space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div
        className={cn(
          "rounded-2xl border p-6 shadow-sm space-y-4 transition-colors",
          form.aiEmployeeEnabled
            ? "border-border bg-card"
            : "border-amber-300/50 bg-amber-50 dark:bg-amber-900/10"
        )}
      >
        <div className="flex items-center gap-2">
          <Power size={14} className={form.aiEmployeeEnabled ? "text-primary" : "text-amber-600"} />
          <p className={cn(
            "text-xs font-bold uppercase tracking-widest",
            form.aiEmployeeEnabled ? "text-primary" : "text-amber-700 dark:text-amber-400"
          )}>
            AI Employee — Master Switch
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={form.aiEmployeeEnabled}
            onChange={(e) => set("aiEmployeeEnabled", e.target.checked)}
          />
          Enable the AI Assistant
        </label>
        <p className="text-xs text-muted-foreground">
          {form.aiEmployeeEnabled
            ? "The AI Assistant chat is available to every signed-in employee. Turning this off removes it app-wide immediately — no redeploy needed."
            : "The AI Assistant is disabled. The chat button won't appear for anyone, and the API will refuse requests, until this is turned back on."}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <GitPullRequest size={14} className="text-amber-600" />
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Auto-Fix PRs (Software Tickets)</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={form.aiAutoFixEnabled}
            onChange={(e) => set("aiAutoFixEnabled", e.target.checked)}
          />
          Enable AI auto-diagnosis for &ldquo;Software&rdquo; category support tickets
        </label>
        <p className="text-xs text-muted-foreground">
          When a staff member reports a Software-category bug, the AI tries to find the cause in the codebase and
          open a <strong>draft</strong> pull request on GitHub for a developer to review — it never merges anything
          itself. Also requires a GitHub token configured under Admin &gt; Integrations.
        </p>
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-100/50 dark:bg-amber-900/20 px-3 py-2">
          <ShieldAlert size={13} className="mt-0.5 flex-shrink-0 text-amber-700 dark:text-amber-400" />
          <ul className="space-y-1 text-[11px] text-amber-800 dark:text-amber-300 list-disc pl-3">
            <li>Only ever changes one file, and only source code files (never config, secrets, security rules, or its own code)</li>
            <li>Only triggers on internally-reported tickets, never customer-facing (NPS) ones</li>
            <li>Capped at 5 draft PRs per day (see DAILY_AI_PR_CAP in ai-bugfix.service.ts)</li>
            <li>Says &ldquo;needs manual triage&rdquo; instead of guessing when it isn&apos;t confident</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Customer WhatsApp Auto-Reply</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={form.aiWhatsAppReplyEnabled}
            onChange={(e) => set("aiWhatsAppReplyEnabled", e.target.checked)}
          />
          Enable AI auto-replies to inbound customer WhatsApp messages
        </label>
        <p className="text-xs text-muted-foreground">
          A separate AI from the staff assistant above — this one talks directly to customers. It only ever states
          prices/packages from your real Packages catalog (never invents one), turns new inquiries into tracked
          Leads automatically, and hands off to a human — pausing itself on that conversation — the moment a
          customer wants a callback, is ready to pay, or asks something it isn&apos;t confident about. Requires
          WhatsApp (Meta Cloud API) to already be configured under Admin &gt; Integrations. Off by default.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sunrise size={14} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Daily Briefing</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={form.aiDailyBriefingEnabled}
            onChange={(e) => set("aiDailyBriefingEnabled", e.target.checked)}
          />
          Email/notify admins each morning with what needs attention
        </label>
        <p className="text-xs text-muted-foreground">
          A daily digest (in-app notification + email) ranking the leads, quotations, invoices, and bookings that
          most need a look today — the same &ldquo;what needs attention&rdquo; ranking already used on the
          Dashboard&apos;s Command Center, just pushed to every admin/super-admin proactively instead of waiting
          for someone to open the dashboard. Read-only — never proposes or makes any change itself.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">How it works</p>
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pl-4">
          <li>Answers questions using live data from leads, quotations, invoices, bookings, customers, and HR policy documents.</li>
          <li>Can propose creating or updating records (a new lead, a booking, approving a leave request, etc.) — every proposal always requires a human to click Confirm before anything is written.</li>
          <li>Respects each employee&apos;s role — it can only propose actions that person is actually permitted to perform.</li>
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3">
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
