"use client";

import { useEffect, useState } from "react";
import { subscribeToConversations } from "@/modules/whatsapp-inbox/services/whatsapp-inbox.service";
import type { WhatsAppConversation } from "@/modules/whatsapp-inbox/types";

export function useWhatsAppConversations() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToConversations((items) => {
      setConversations(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { conversations, loading };
}
