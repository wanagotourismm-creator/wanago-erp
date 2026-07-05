"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, Bot } from "lucide-react";
import { useHrChat } from "@/modules/ess/hooks/useHrChat";
import { cn } from "@/lib/utils/helpers";
import type { LeaveBalance } from "@/modules/ess/hooks/useEss";
import type { Employee } from "@/modules/hrms/shared/types";
import type { Holiday } from "@/modules/admin/holidays/types";

const SUGGESTIONS = [
  "How many casual leave days do I have left?",
  "What's the difference between sick and casual leave?",
  "When is the next company holiday?",
  "How do I apply for leave?",
];

type Props = {
  employee: Employee;
  leaveBalances: LeaveBalance[];
  holidays: Holiday[];
};

export function HrChatPanel({ employee, leaveBalances, holidays }: Props) {
  const context = {
    employeeName: employee.fullName,
    department: employee.department,
    designation: employee.designation,
    leaveBalances: leaveBalances.map((b) => ({ type: b.type, remaining: b.remaining, entitlement: b.entitlement })),
    upcomingHolidays: holidays
      .filter((h) => h.date >= new Date().toISOString().slice(0, 10))
      .slice(0, 5)
      .map((h) => ({ name: h.name, date: h.date })),
  };

  const { messages, loading, error, send } = useHrChat(context);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  function handleSend(text?: string) {
    const content = text ?? draft;
    if (!content.trim() || loading) return;
    send(content);
    setDraft("");
  }

  return (
    <div className="fluid-card flex h-[520px] flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4 flex-shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Ask HR</p>
          <p className="text-xs text-muted-foreground">AI assistant for leave, attendance & policy questions</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot size={13} className="text-primary" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm text-foreground">
                Hi {employee.fullName.split(" ")[0]}! I can help with leave balances, holidays, and HR policy questions. What would you like to know?
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-9">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => handleSend(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex items-start gap-2.5", m.role === "user" && "flex-row-reverse")}>
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot size={13} className="text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
              m.role === "user" ? "rounded-tr-sm bg-primary text-white" : "rounded-tl-sm bg-muted/60 text-foreground"
            )}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot size={13} className="text-primary" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5">
              <Loader2 size={13} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3 flex-shrink-0">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Ask about leave, attendance, holidays..."
          className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none hover:border-primary/40 focus:border-primary transition-all"
        />
        <button onClick={() => handleSend()} disabled={loading || !draft.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
