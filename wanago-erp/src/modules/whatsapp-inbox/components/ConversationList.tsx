"use client";

import { MessageCircle, Frown, Smile } from "lucide-react";
import { cn, initials, timeAgo } from "@/lib/utils/helpers";
import type { WhatsAppConversation, WhatsAppIntent } from "@/modules/whatsapp-inbox/types";

type Props = {
  conversations: WhatsAppConversation[];
  loading: boolean;
  activeId: string | null;
  onSelect: (c: WhatsAppConversation) => void;
};

const INTENT_LABELS: Record<WhatsAppIntent, string> = {
  new_inquiry:      "New Inquiry",
  booking_question:  "Booking",
  payment:           "Payment",
  complaint:         "Complaint",
  general:           "General",
};

// Only surfaces a badge for signal worth a glance — neutral sentiment and
// "general" intent are the common case and would just be visual noise on
// every row, so those render nothing.
function ConversationBadges({ sentiment, intent }: { sentiment: WhatsAppConversation["sentiment"]; intent: WhatsAppConversation["intent"] }) {
  if (!sentiment && !intent) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {sentiment === "negative" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold text-destructive">
          <Frown size={9} /> Negative
        </span>
      )}
      {sentiment === "positive" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-[9px] font-semibold text-green-700 dark:text-green-400">
          <Smile size={9} /> Positive
        </span>
      )}
      {intent && intent !== "general" && (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
          {INTENT_LABELS[intent]}
        </span>
      )}
    </div>
  );
}

export function ConversationList({ conversations, loading, activeId, onSelect }: Props) {
  if (loading) {
    return <p className="px-4 py-6 text-center text-xs text-muted-foreground">Loading conversations…</p>;
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <MessageCircle size={22} className="text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No conversations yet — inbound WhatsApp messages will show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className={cn(
            "flex items-start gap-2.5 border-b border-border px-3 py-3 text-left transition-colors",
            activeId === c.id ? "bg-primary/10" : "hover:bg-muted/60"
          )}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
            {initials(c.customerName ?? c.phoneNumber)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("truncate text-sm", c.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground")}>
                {c.customerName ?? c.phoneNumber}
              </p>
              <span className="flex-shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs text-muted-foreground">
                {c.lastMessageDirection === "outbound" && <span className="text-muted-foreground/70">You: </span>}
                {c.lastMessagePreview ?? "—"}
              </p>
              {c.unreadCount > 0 && (
                <span className="flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {c.unreadCount}
                </span>
              )}
            </div>
            <ConversationBadges sentiment={c.sentiment} intent={c.intent} />
          </div>
        </button>
      ))}
    </div>
  );
}
