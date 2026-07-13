"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, CheckCheck, Clock, AlertTriangle, Languages } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils/helpers";
import { translateText } from "@/modules/whatsapp-inbox/services/whatsapp-ai.service";
import type { WhatsAppMessage } from "@/modules/whatsapp-inbox/types";

function StatusIcon({ status }: { status: WhatsAppMessage["deliveryStatus"] }) {
  if (status === "failed") return <AlertTriangle size={11} className="text-destructive" />;
  if (status === "read") return <CheckCheck size={12} className="text-primary" />;
  if (status === "delivered") return <CheckCheck size={12} className="text-muted-foreground" />;
  if (status === "sent") return <Check size={12} className="text-muted-foreground" />;
  return <Clock size={11} className="text-muted-foreground" />;
}

// Inbound (customer) messages get an on-demand "Translate" action — staff
// can read a Malayalam message in English without it being stored/sent
// anywhere, just shown inline under the original.
function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  async function handleTranslate() {
    setTranslating(true);
    const result = await translateText(message.body, "en");
    setTranslated("error" in result ? result.error : result.text);
    setTranslating(false);
  }

  return (
    <div className={cn("mb-2 flex", message.direction === "outbound" ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
        message.direction === "outbound" ? "bg-primary text-white" : "bg-muted text-foreground"
      )}>
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        {translated && (
          <p className="mt-1 whitespace-pre-wrap break-words border-t border-current/10 pt-1 text-xs italic opacity-80">
            {translated}
          </p>
        )}
        <div className={cn(
          "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
          message.direction === "outbound" ? "text-white/70" : "text-muted-foreground"
        )}>
          {message.direction === "outbound" && message.sentByName && <span>{message.sentByName} · </span>}
          <span>{timeAgo(message.createdAt)}</span>
          {message.direction === "outbound" && <StatusIcon status={message.deliveryStatus} />}
          {message.direction === "inbound" && !translated && (
            <button onClick={handleTranslate} disabled={translating} className="hover:text-foreground transition-colors">
              {translating ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type Props = {
  messages: WhatsAppMessage[];
  loading: boolean;
};

export function MessageThread({ messages, loading }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>;
  }

  if (messages.length === 0) {
    return <div className="flex flex-1 items-center justify-center"><p className="text-xs text-muted-foreground">No messages in this conversation yet.</p></div>;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
      {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
    </div>
  );
}
