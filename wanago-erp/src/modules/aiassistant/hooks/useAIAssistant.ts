"use client";

import { useState, useCallback } from "react";
import { askAssistant, type AssistantTurn } from "@/modules/aiassistant/services/ai-assistant.service";
import type { AIChatMessage } from "@/modules/aiassistant/types";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

export function useAIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const openPanel  = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);

  const ask = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history: AssistantTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const result = await askAssistant(trimmed, history);
      setMessages((prev) => [...prev, {
        id: nextId(), role: "assistant",
        content: result.answer, source: result.source, articles: result.articles,
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  return { open, openPanel, closePanel, messages, loading, ask };
}
