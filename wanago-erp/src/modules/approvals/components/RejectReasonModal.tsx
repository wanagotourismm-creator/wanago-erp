"use client";

import { useState, useEffect } from "react";
import { X, Loader2, XCircle } from "lucide-react";

type Props = {
  open:      boolean;
  onClose:   () => void;
  onReject:  (reason: string) => Promise<void>;
  itemLabel: string;
};

export function RejectReasonModal({ open, onClose, onReject, itemLabel }: Props) {
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (open) { setReason(""); setError(null); }
  }, [open]);

  if (!open) return null;

  async function handleReject() {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onReject(reason.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-md flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
              <XCircle size={16} className="text-destructive" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Reject {itemLabel}?</h2>
              <p className="text-xs text-muted-foreground">Provide a reason for this rejection</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rejection Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why this is being rejected..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={handleReject}
            disabled={submitting || !reason.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-6 py-2 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-60 transition-colors shadow-sm"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Reject
          </button>
        </div>

      </div>
    </div>
  );
}
