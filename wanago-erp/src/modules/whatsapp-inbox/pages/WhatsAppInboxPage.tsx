"use client";

import { useState } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils/helpers";
import { useWhatsAppConversations } from "@/modules/whatsapp-inbox/hooks/useWhatsAppConversations";
import { useWhatsAppThread } from "@/modules/whatsapp-inbox/hooks/useWhatsAppThread";
import { ConversationList } from "@/modules/whatsapp-inbox/components/ConversationList";
import { MessageThread } from "@/modules/whatsapp-inbox/components/MessageThread";
import { ReplyComposer } from "@/modules/whatsapp-inbox/components/ReplyComposer";
import type { WhatsAppConversation } from "@/modules/whatsapp-inbox/types";

export function WhatsAppInboxPage() {
  const { conversations, loading: conversationsLoading } = useWhatsAppConversations();
  const [active, setActive] = useState<WhatsAppConversation | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const { messages, loading: messagesLoading, sending, reply } = useWhatsAppThread(active?.id ?? null);

  function selectConversation(c: WhatsAppConversation) {
    setActive(c);
    setMobileView("thread");
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{active.customerName ?? active.phoneNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">{active.phoneNumber}</p>
                </div>
              </div>
              <MessageThread messages={messages} loading={messagesLoading} />
              <ReplyComposer disabled={!active} sending={sending} onSend={reply} />
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
