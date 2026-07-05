"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, AlertTriangle, BookOpen } from "lucide-react";
import { useAIAssistant } from "@/modules/aiassistant/hooks/useAIAssistant";
import { cn } from "@/lib/utils/helpers";
import type { AIChatMessage } from "@/modules/aiassistant/types";

function AssistantMessage({ message }: { message: AIChatMessage }) {
  const isFallback = message.source === "kb-only" || message.source === "no-match";

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {isFallback && message.source === "kb-only" && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 w-fit">
            <AlertTriangle size={11} />
            Showing help article (AI temporarily unavailable)
          </div>
        )}

        {message.content && (
          <div className="rounded-2xl bg-muted px-3 py-2 text-foreground">
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}

        {isFallback && message.articles && message.articles.length > 0 && (
          <div className="space-y-2">
            {message.articles.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <BookOpen size={12} className="text-primary flex-shrink-0" />
                  <p className="text-xs font-semibold text-foreground">{a.title}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIAssistantPanel() {
  const { open, openPanel, closePanel, messages, loading, ask } = useAIAssistant();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  function handleSend() {
    if (!draft.trim() || loading) return;
    const question = draft;
    setDraft("");
    ask(question);
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={openPanel}
        aria-label="Ask Wanago Assistant"
        className={cn(
          "fixed bottom-36 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full",
          "bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all",
          "h-[52px] w-[52px]",
          "lg:bottom-6 lg:right-6",
          open && "hidden"
        )}
      >
        <Sparkles size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={closePanel} />
          <div className="modal-enter relative flex h-full w-full sm:h-[600px] sm:w-[420px] sm:max-h-[85vh] flex-col overflow-hidden rounded-none sm:rounded-2xl border border-border bg-card shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Wanago Assistant</p>
                  <p className="text-[11px] text-muted-foreground">Ask how to use the ERP</p>
                </div>
              </div>
              <button onClick={closePanel} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={15} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                    <Sparkles size={20} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Ask me anything about using Wanago ERP</p>
                  <p className="mt-1 text-xs text-muted-foreground">e.g. &ldquo;How do I apply for leave?&rdquo; or &ldquo;How do I create an invoice?&rdquo;</p>
                </div>
              )}

              {messages.map((m) => (
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-white">
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  </div>
                ) : (
                  <AssistantMessage key={m.id} message={m} />
                )
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  placeholder="Ask a question…"
                  disabled={loading}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !draft.trim()}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
