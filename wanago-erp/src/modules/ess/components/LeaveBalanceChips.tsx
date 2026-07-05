"use client";

import type { LeaveBalance } from "@/modules/ess/hooks/useEss";

const LABELS: Record<string, string> = { casual: "CL", sick: "SL", earned: "EL" };

export function LeaveBalanceChips({ balances }: { balances: LeaveBalance[] }) {
  return (
    <div className="flex items-center gap-2">
      {balances.map((b) => (
        <div key={b.type} title={`${LABELS[b.type] ?? b.type}: ${b.remaining} of ${b.entitlement} days left`}
          className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5">
          <span className="text-xs font-semibold text-foreground">{LABELS[b.type] ?? b.type}</span>
          <span className="text-xs font-bold text-primary">{b.remaining}</span>
        </div>
      ))}
    </div>
  );
}
