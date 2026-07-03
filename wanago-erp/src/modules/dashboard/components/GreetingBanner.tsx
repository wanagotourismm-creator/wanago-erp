"use client";

import { useState, useEffect } from "react";
import { useClock } from "@/modules/dashboard/hooks/useDashboard";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { Plus, Download } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const QUOTES = [
  "Plan, prioritize, and accomplish your travel goals.",
  "Every journey begins with a single booking.",
  "Great teams build great travel experiences.",
  "Today is a great day to close a deal.",
];

type Props = { newLeads: number; followUpCount: number };

export function GreetingBanner({ newLeads, followUpCount }: Props) {
  const { user }       = useAuthStore();
  const clock          = useClock();
  const { colorTheme } = useThemeStore();
  const name           = user?.displayName ?? "there";
  const [quote, setQuote] = useState("");

  useEffect(() => {
    setQuote(QUOTES[new Date().getDay() % QUOTES.length]);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary px-7 py-6 text-white shadow-lg fluid-card">
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/8" />
      <div className="absolute right-32 -bottom-8 h-32 w-32 rounded-full bg-white/8" />
      <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-white/8" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{getGreeting()}, {name}! 👋</h2>
          <p className="text-sm text-white/65">&ldquo;{quote}&rdquo;</p>
          {(newLeads > 0 || followUpCount > 0) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {newLeads > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
                  {newLeads} new lead{newLeads > 1 ? "s" : ""}
                </span>
              )}
              {followUpCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/40 px-3 py-1 text-xs font-medium text-amber-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  {followUpCount} follow-up pending
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-3">
          <div className="text-right">
            <p className="font-mono text-4xl font-bold tracking-tight tabular-nums">{clock}</p>
            <p className="mt-0.5 text-sm text-white/55">
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-fluid inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25 transition-colors">
              <Download size={13} /> Import Data
            </button>
            <button className="btn-fluid inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-white/90 transition-colors shadow-sm">
              <Plus size={13} /> Add Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
