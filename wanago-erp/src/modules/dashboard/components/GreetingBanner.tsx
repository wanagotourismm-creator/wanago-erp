"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClock } from "@/modules/dashboard/hooks/useDashboard";
import { useAuthStore } from "@/store/auth.store";
import { Plus } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const QUOTES = [
  "Plan, prioritize, and accomplish your travel goals with ease.",
  "Every journey begins with a single booking.",
  "Great teams build great travel experiences.",
  "Today is a great day to close a deal.",
];

type Props = { newLeads: number; followUpCount: number };

export function GreetingBanner({ newLeads, followUpCount }: Props) {
  const { user } = useAuthStore();
  const router   = useRouter();
  const clock    = useClock();
  const name     = user?.displayName ?? "there";
  const quote    = QUOTES[new Date().getDay() % QUOTES.length];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary px-4 py-4 text-white shadow-md sm:px-7 sm:py-6">
      {/* Background decorations */}
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <div className="absolute right-32 -bottom-8 h-32 w-32 rounded-full bg-white/5" />
      <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-white/5" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">

        {/* Left — greeting */}
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-lg font-bold tracking-tight sm:text-2xl">
            {getGreeting()}, {name}! 👋
          </h2>
          <p className="text-xs text-white/70 sm:text-sm">&ldquo;{quote}&rdquo;</p>
          {(newLeads > 0 || followUpCount > 0) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {newLeads > 0 && (
                <Link
                  href="/leads"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white transition-colors active:scale-95 sm:hover:bg-white/30"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
                  {newLeads} active lead{newLeads > 1 ? "s" : ""}
                </Link>
              )}
              {followUpCount > 0 && (
                <Link
                  href="/leads?stage=follow_up"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/40 px-3 py-1 text-xs font-medium text-amber-100 transition-colors active:scale-95 sm:hover:bg-amber-500/60"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  {followUpCount} follow-up pending
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right — clock + actions */}
        <div className="flex flex-shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className="sm:text-right">
            <p className="font-mono text-2xl font-bold tracking-tight tabular-nums text-white sm:text-4xl">
              {clock}
            </p>
            <p className="mt-0.5 text-xs text-white/60 sm:text-sm">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short", day: "numeric",
                month: "short", year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/leads?new=1")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors active:scale-95 sm:hover:bg-white/90"
            >
              <Plus size={13} />
              Add Lead
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
