"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, Check, Megaphone } from "lucide-react";
import { broadcastAnnouncement } from "@/modules/admin/announcements/services/announcement.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import { cn } from "@/lib/utils/helpers";
import type { Office } from "@/modules/admin/offices/types";

export function AnnouncementComposer() {
  const { user } = useAuthStore();
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOffices().then(setOffices).catch(() => {});
  }, []);

  function toggleOffice(id: string) {
    setSelectedOffices(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);
    setSent(null);
  }

  async function handleSend() {
    if (!text.trim()) { setError("Write an announcement first."); return; }
    setError(null);
    setSending(true);
    try {
      const count = await broadcastAnnouncement(text, selectedOffices, user?.uid ?? "", user?.displayName ?? "Admin");
      setSent(count);
      setText("");
      logActivity({
        entityType: "Announcement", entityName: "Broadcast", action: "created",
        detail: `Broadcast announcement to ${count} office(s)`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    } catch {
      setError("Failed to send announcement.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Megaphone size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Broadcast Announcement</p>
          <p className="text-xs text-muted-foreground">Posted to each office&apos;s Announcements channel in Team Space</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Offices</label>
        <div className="flex flex-wrap gap-2">
          {offices.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggleOffice(o.id)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                selectedOffices.includes(o.id)
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {o.name}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Leave all unselected to broadcast to every office.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Message</label>
        <textarea
          rows={4}
          placeholder="Write your announcement..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {sent !== null && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <Check size={13} /> Sent to {sent} office{sent !== 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Broadcast
        </button>
      </div>
    </div>
  );
}
