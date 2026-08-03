"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/helpers";
import type { Ticket } from "@/modules/tickets/types";

type Props = {
  ticket:    Ticket | null;
  onClose:   () => void;
  onConfirm: (notes: string) => Promise<{ error: string | null }>;
};

// Resolving now requires saying how it was actually fixed — resolutionNotes
// existed on the Ticket type from the start but nothing ever captured it
// until this modal. Those notes feed the AI's searchable knowledge base
// (see /api/tickets/[id]/summarize-resolution) so the same fix can be
// found automatically next time, instead of every ticket starting from zero.
export function ResolveTicketModal({ ticket, onClose, onConfirm }: Props) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ticket) return null;

  async function handleConfirm() {
    if (!notes.trim()) { setError("Describe how this was fixed before marking it resolved."); return; }
    setSaving(true);
    setError(null);
    const result = await onConfirm(notes.trim());
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setNotes("");
  }

  return (
    <Modal onClose={onClose} size="sm">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 size={17} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">Resolve &ldquo;{ticket.title}&rdquo;</h2>
          <p className="text-xs text-muted-foreground">{ticket.refNumber}</p>
        </div>
      </div>

      <div className="space-y-3 p-6">
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">How was this fixed?</label>
          <textarea
            rows={4}
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Reset the user's Wi-Fi profile and reinstalled the printer driver."
            className={cn(
              "w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
              "placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary",
              "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
            )}
          />
          <p className="text-[11px] text-muted-foreground">Feeds the AI assistant&apos;s knowledge base — future staff (and the AI) can find this fix automatically.</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Mark Resolved
        </button>
      </div>
    </Modal>
  );
}
