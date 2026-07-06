"use client";

import { useEffect, useState } from "react";
import { Loader2, User, KeyRound, Palette } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import { useAccountSettings } from "@/modules/account/hooks/useAccountSettings";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

type StatusMsg = { type: "success" | "error"; text: string };

export function AccountSettingsPage() {
  const { user, phone, loading, updateProfile, sendPasswordReset } = useAccountSettings();

  const [displayName, setDisplayName] = useState("");
  const [phoneInput, setPhoneInput]   = useState("");
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState<StatusMsg | null>(null);

  const [resetSending, setResetSending] = useState(false);
  const [resetMsg, setResetMsg]         = useState<StatusMsg | null>(null);

  useEffect(() => {
    if (user) setDisplayName(user.displayName ?? "");
  }, [user?.displayName]);

  useEffect(() => {
    if (!loading) setPhoneInput(phone ?? "");
  }, [loading, phone]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    const { error } = await updateProfile({
      displayName: displayName.trim(),
      phone:       phoneInput.trim() || null,
    });
    setSaving(false);
    setSaveMsg(
      error
        ? { type: "error", text: error }
        : { type: "success", text: "Profile updated." }
    );
  }

  async function handleReset() {
    setResetSending(true);
    setResetMsg(null);
    const { error } = await sendPasswordReset();
    setResetSending(false);
    setResetMsg(
      error
        ? { type: "error", text: error }
        : { type: "success", text: `Reset link sent to ${user?.email}` }
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My Account" description="Manage your profile and account preferences" />

      <div className="space-y-6">
        {/* ── My Profile ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={16} className="text-primary" />
              <CardTitle>My Profile</CardTitle>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
            <ReadOnlyField
              label="Role"
              value={`${SYSTEM_ROLE_LABELS[user.systemRole] ?? user.systemRole} · ${TEAM_ROLE_LABELS[user.teamRole] ?? user.teamRole}`}
            />
            <ReadOnlyField label="Office" value={user.officeName} />
            <ReadOnlyField label="Department" value={user.department} />
            <ReadOnlyField label="Email" value={user.email} />
          </div>

          <form onSubmit={handleSave} className="space-y-4 border-t border-border pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Display Name">
                <input
                  className={inputClass}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  disabled={loading}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91 98765 43210"
                  disabled={loading}
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving || loading || !displayName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
              {saveMsg && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    saveMsg.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  )}
                >
                  {saveMsg.text}
                </p>
              )}
            </div>
          </form>
        </Card>

        {/* ── Change Password ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-primary" />
              <CardTitle>Change Password</CardTitle>
            </div>
          </CardHeader>
          <p className="mb-4 text-sm text-muted-foreground">
            We&apos;ll send a password reset link to{" "}
            <span className="font-medium text-foreground">{user.email}</span>. Follow the link in
            the email to set a new password.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetSending}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-muted disabled:opacity-60 transition-colors"
            >
              {resetSending && <Loader2 size={14} className="animate-spin" />}
              Send Password Reset Email
            </button>
            {resetMsg && (
              <p
                className={cn(
                  "text-xs font-medium",
                  resetMsg.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                )}
              >
                {resetMsg.text}
              </p>
            )}
          </div>
        </Card>

        {/* ── Appearance ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-primary" />
              <CardTitle>Appearance</CardTitle>
            </div>
          </CardHeader>
          <p className="text-sm text-muted-foreground">
            Theme (light / dark) and accent color can be changed from your avatar menu in the
            top-right corner of the app.
          </p>
        </Card>
      </div>
    </div>
  );
}
