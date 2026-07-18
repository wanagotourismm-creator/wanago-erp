"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Check, ShieldAlert } from "lucide-react";
import type { SecuritySettings } from "@/modules/security/services/security-settings.service";

type Props = {
  settings: SecuritySettings;
  saving:   boolean;
  onSave:   (data: SecuritySettings) => Promise<{ error: string | null }>;
};

export function SecuritySettingsForm({ settings, saving, onSave }: Props) {
  const [pin, setPin] = useState(settings.deletePin ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setPin(settings.deletePin ?? ""); }, [settings]);

  async function handleSave() {
    setError(null);
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN must be 4-8 digits.");
      return;
    }
    const result = await onSave({ deletePin: pin });
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
        <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          Anyone deleting a record (Admin/Super Admin only — delete is already
          hidden from every other role) will be asked to enter this PIN first,
          as an extra confirmation step against accidental deletes.
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Delete Confirmation PIN</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 1234"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none tracking-widest focus:border-primary focus:ring-0"
        />
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
          Save PIN
        </button>
      </div>
    </div>
  );
}
