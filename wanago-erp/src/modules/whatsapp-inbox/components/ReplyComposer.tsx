"use client";

import { useState } from "react";
import { Send, Loader2, AlertTriangle, X } from "lucide-react";

type Props = {
  disabled: boolean;
  sending: boolean;
  onSend: (body: string) => Promise<{ error: string | null }>;
};

export function ReplyComposer({ disabled, sending, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const text = draft.trim();
    if (!text || disabled) return;
    setDraft("");
    setError(null);
    const { error } = await onSend(text);
    if (error) {
      // Restore the draft so a failed send doesn't silently lose it.
      setDraft(text);
      setError(error);
    }
  }

  return (
    <div className="border-t border-border p-3">
      {error && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
          <AlertTriangle size={11} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X size={11} /></button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder={disabled ? "Select a conversation…" : "Type a reply…"}
          disabled={disabled}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || sending || !draft.trim()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        Replies within 24h of the customer&apos;s last message are free. Outside that window, WhatsApp requires a pre-approved message template.
      </p>
    </div>
  );
}
