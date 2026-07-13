"use client";

import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

export type BadgeMilestone = { value: number; label: string; icon: LucideIcon };

type Props = {
  current: number;
  milestones: BadgeMilestone[];
  currentLabel: string; // e.g. "referrals", "bookings"
};

// Purely a recognition/motivation display — reaching a milestone doesn't
// unlock anything the app grants automatically (no bonus tier, no
// discount); that's a real business/financial decision for Wanago to make
// separately, not something to imply exists just because a badge lit up.
export function BadgeTrack({ current, milestones, currentLabel }: Props) {
  const sorted = [...milestones].sort((a, b) => a.value - b.value);
  const next = sorted.find(m => current < m.value);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Milestones</p>
        {next && (
          <p className="text-xs text-muted-foreground">
            {next.value - current} more {currentLabel} to <span className="font-medium text-primary">{next.label}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
        {sorted.map((m) => {
          const unlocked = current >= m.value;
          const Icon = m.icon;
          return (
            <div
              key={m.value}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                unlocked ? "bg-primary text-white" : "bg-muted text-muted-foreground/50"
              )}>
                {unlocked ? <Icon size={16} /> : <Lock size={13} />}
              </div>
              <p className={cn("text-[11px] font-semibold", unlocked ? "text-foreground" : "text-muted-foreground/60")}>{m.label}</p>
              <p className="text-[10px] text-muted-foreground">{m.value}+</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
