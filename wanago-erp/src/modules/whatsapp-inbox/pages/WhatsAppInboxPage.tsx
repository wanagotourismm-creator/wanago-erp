"use client";

import { useState } from "react";
import { ChevronLeft, MessageCircle, Sparkles, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils/helpers";
import { useWhatsAppConversations } from "@/modules/whatsapp-inbox/hooks/useWhatsAppConversations";
import { useWhatsAppThread } from "@/modules/whatsapp-inbox/hooks/useWhatsAppThread";
import { ConversationList } from "@/modules/whatsapp-inbox/components/ConversationList";
import { MessageThread } from "@/modules/whatsapp-inbox/components/MessageThread";
import { ReplyComposer } from "@/modules/whatsapp-inbox/components/ReplyComposer";
import { summarizeThread } from "@/modules/whatsapp-inbox/services/whatsapp-ai.service";
import type { WhatsAppConversation } from "@/modules/whatsapp-inbox/types";

export function WhatsAppInboxPage() {
  const { conversations, loading: conversationsLoading } = useWhatsAppConversations();
  const [active, setActive] = useState<WhatsAppConversation | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const { messages, loading: messagesLoading, sending, reply } = useWhatsAppThread(active?.id ?? null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  async function handleSummarize() {
    if (!active || messages.length === 0) return;
    setSummarizing(true);
    setSummary(null);
    const result = await summarizeThread(messages, active.customerName);
    setSummary("error" in result ? result.error : result.text);
    setSummarizing(false);
  }

  function selectConversation(c: WhatsAppConversation) {
    setActive(c);
    setMobileView("thread");
    setSummary(null);
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp Inbox"
        description="Two-way customer conversations over WhatsApp."
        tourId="whatsapp-inbox-page"
      />

      <div className="flex h-[75vh] min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className={cn(
          "w-full flex-shrink-0 flex-col overflow-y-auto border-r border-border sm:flex sm:w-[300px]",
          mobileView === "thread" ? "hidden" : "flex"
        )}>
          <ConversationList
            conversations={conversations}
            loading={conversationsLoading}
            activeId={active?.id ?? null}
            onSelect={selectConversation}
          />
        </div>

        <div className={cn("min-h-0 flex-1 flex-col", mobileView === "list" ? "hidden sm:flex" : "flex")}>
          {active ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <button
                  onClick={() => setMobileView("list")}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{active.customerName ?? active.phoneNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">{active.phoneNumber}</p>
                </div>
                <button
                  onClick={handleSummarize}
                  disabled={summarizing || messages.length === 0}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                >
                  {summarizing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Summarize
                </button>
              </div>
              {summary && (
                <div className="flex items-start gap-2 border-b border-border bg-primary/5 px-4 py-2.5 text-xs text-foreground">
                  <Sparkles size={12} className="mt-0.5 flex-shrink-0 text-primary" />
                  <p className="flex-1">{summary}</p>
                  <button onClick={() => setSummary(null)} className="flex-shrink-0 text-muted-foreground hover:text-foreground"><X size={12} /></button>
                </div>
              )}
              <MessageThread messages={messages} loading={messagesLoading} />
              <ReplyComposer
                disabled={!active}
                sending={sending}
                onSend={reply}
                messages={messages}
                customerName={active.customerName}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <MessageCircle size={26} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select a conversation to view messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
