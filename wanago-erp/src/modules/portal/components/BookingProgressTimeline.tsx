"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type Props = { status: string; balanceAmount: number };

const STEPS = ["Requested", "Confirmed", "Balance Cleared", "Trip Complete"];

// A cancelled/rejected booking gets its own distinct treatment rather than
// being forced into the happy-path stepper.
export function BookingProgressTimeline({ status, balanceAmount }: Props) {
  if (status === "cancelled" || status === "finance_rejected" || status === "ops_rejected") {
    return (
      <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-[11px] font-medium text-destructive">
        This booking was cancelled — contact us if that&apos;s unexpected.
      </div>
    );
  }

  const completedSteps =
    status === "completed" ? 4 :
    (status === "confirmed" && balanceAmount <= 0) ? 3 :
    status === "confirmed" ? 2 :
    1;

  return (
    <div className="mt-2.5 flex items-center gap-1">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum <= completedSteps;
        return (
          <div key={label} className="flex flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                done ? "bg-primary text-white" : "bg-muted text-muted-foreground/50"
              )}>
                {done ? <Check size={11} /> : stepNum}
              </div>
              <span className={cn("hidden text-center text-[9px] leading-tight sm:block", done ? "text-foreground font-medium" : "text-muted-foreground/60")}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 rounded-full transition-colors", stepNum < completedSteps ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
