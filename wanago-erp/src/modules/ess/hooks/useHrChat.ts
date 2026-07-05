"use client";

import { useState } from "react";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatContext = {
  employeeName?: string;
  department?: string;
  designation?: string;
  leaveBalances?: { type: string; remaining: number; entitlement: number }[];
  upcomingHolidays?: { name: string; date: string }[];
};

export function useHrChat(context: ChatContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hr-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setMessages((p) => [...p, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach the AI assistant. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return { messages, loading, error, send };
}
