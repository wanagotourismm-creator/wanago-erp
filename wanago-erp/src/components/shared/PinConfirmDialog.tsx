"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useSecuritySettings } from "@/modules/security/hooks/useSecuritySettings";

type Props = {
  open:    boolean;
  title?:  string;
  message?: string;
  onConfirm: () => void;
  onCancel:  () => void;
};

// Generic confirm-with-PIN gate — used in front of delete actions across
// the app (Leads/Customers/Bookings today) so a destructive click needs a
// second, deliberate step. The PIN itself is a company-wide setting (see
// SecuritySettingsForm), not a per-role permission boundary — the real
// access control is that only Admin/Super Admin ever see a Delete button
// or pass the Firestore delete rule at all; this is a "are you sure"
// friction step on top of that, not a substitute for it.
export function PinConfirmDialog({ open, title = "Confirm delete", message, onConfirm, onCancel }: Props) {
  const { settings, loading } = useSecuritySettings();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setPin(""); setError(null); }
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    if (!settings.deletePin) {
      setError("No delete PIN is set yet — a Super Admin can set one in Admin > Security.");
      return;
    }
    if (pin !== settings.deletePin) {
      setError("Incorrect PIN.");
      return;
    }
    onConfirm();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="modal-enter relative w-full max-w-sm rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
            <ShieldAlert size={16} className="text-destructive" />
          </div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>

        {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={8}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              placeholder="Enter PIN"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-center tracking-[0.4em] outline-none focus:border-primary focus:ring-0"
            />
            {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-60 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
