"use client";

import { useCallback, useEffect, useState } from "react";
import {
  subscribeToMessages, sendReply, markConversationRead,
} from "@/modules/whatsapp-inbox/services/whatsapp-inbox.service";
import type { WhatsAppMessage } from "@/modules/whatsapp-inbox/types";

export function useWhatsAppThread(conversationId: string | null) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!conversationId) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToMessages(conversationId, (items) => {
      setMessages(items);
      setLoading(false);
    });
    markConversationRead(conversationId).catch(() => {});
    return unsub;
  }, [conversationId]);

  const reply = useCallback(async (body: string): Promise<{ error: string | null }> => {
    if (!conversationId) return { error: "No conversation selected" };
    setSending(true);
    try {
      await sendReply(conversationId, body);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to send message" };
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  return { messages, loading, sending, reply };
}
