"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClock } from "@/modules/dashboard/hooks/useDashboard";
import { useAuthStore } from "@/store/auth.store";
import { Plus } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { initials } from "@/lib/utils/helpers";

// Rough "how far into the workday" indicator for the ring — a real
// time-based value (not a fabricated task count), assuming a 9am–6pm day.
// Purely decorative outside typical office hours (clamped to 0/100).
function workdayProgress(): number {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  return Math.max(0, Math.min(100, ((hours - 9) / 9) * 100));
}

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
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">

        {/* Left — ring + greeting */}
        <div className="flex items-center gap-3">
          <ProgressRing value={workdayProgress()} size={52} label={initials(name)} caption="TODAY" className="flex-shrink-0" />
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-bold tracking-tight text-foreground sm:text-xl">
              {getGreeting()}, {name}! 👋
            </h2>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">&ldquo;{quote}&rdquo;</p>
          </div>
        </div>

        {/* Right — clock + actions */}
        <div className="flex flex-shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className="sm:text-right">
            <p className="font-mono text-xl font-bold tracking-tight tabular-nums text-foreground sm:text-2xl">
              {clock}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short", day: "numeric",
                month: "short", year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={() => router.push("/leads?new=1")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors active:scale-95 hover:bg-primary/90"
          >
            <Plus size={13} />
            Add Lead
          </button>
        </div>

      </div>

      {(newLeads > 0 || followUpCount > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
          {newLeads > 0 ? (
            <Link href="/leads" className="rounded-xl bg-muted/50 px-3 py-2 transition-colors active:scale-[0.98] hover:bg-muted">
              <p className="stat-figure text-lg text-foreground">{newLeads}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">Active lead{newLeads > 1 ? "s" : ""}</p>
            </Link>
          ) : <div />}
          {followUpCount > 0 ? (
            <Link href="/leads?stage=follow_up" className="rounded-xl bg-amber-500/10 px-3 py-2 transition-colors active:scale-[0.98] hover:bg-amber-500/15">
              <p className="stat-figure text-lg text-amber-600 dark:text-amber-400">{followUpCount}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">Follow-up pending</p>
            </Link>
          ) : <div />}
        </div>
      )}
    </div>
  );
}
