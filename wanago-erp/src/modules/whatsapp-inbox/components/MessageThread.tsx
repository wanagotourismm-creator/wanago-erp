"use client";

import { useEffect, useRef } from "react";
import { Loader2, Check, CheckCheck, Clock, AlertTriangle } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils/helpers";
import type { WhatsAppMessage } from "@/modules/whatsapp-inbox/types";

function StatusIcon({ status }: { status: WhatsAppMessage["deliveryStatus"] }) {
  if (status === "failed") return <AlertTriangle size={11} className="text-destructive" />;
  if (status === "read") return <CheckCheck size={12} className="text-primary" />;
  if (status === "delivered") return <CheckCheck size={12} className="text-muted-foreground" />;
  if (status === "sent") return <Check size={12} className="text-muted-foreground" />;
  return <Clock size={11} className="text-muted-foreground" />;
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
      {messages.map((m) => (
        <div key={m.id} className={cn("mb-2 flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
          <div className={cn(
            "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
            m.direction === "outbound" ? "bg-primary text-white" : "bg-muted text-foreground"
          )}>
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <div className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10px]",
              m.direction === "outbound" ? "text-white/70" : "text-muted-foreground"
            )}>
              {m.direction === "outbound" && m.sentByName && <span>{m.sentByName} · </span>}
              <span>{timeAgo(m.createdAt)}</span>
              {m.direction === "outbound" && <StatusIcon status={m.deliveryStatus} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
