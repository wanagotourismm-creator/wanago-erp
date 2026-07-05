"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PayrollStatusBadge, MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";
import { cn, initials, formatCurrency, timeAgo } from "@/lib/utils/helpers";
import type { PayoutRow } from "@/modules/dashboard/hooks/usePayoutSummary";

export function PayoutPanel({ rows }: { rows: PayoutRow[] }) {
  return (
    <Card radius="3xl">
      <CardHeader>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Payout Monthly</p>
          <CardTitle>Salaries &amp; Incentives</CardTitle>
        </div>
      </CardHeader>

      <div className="-mx-1 max-h-[360px] space-y-1 overflow-y-auto scrollbar-thin px-1">
        {rows.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No payroll records yet</p>}
        {rows.map((r, i) => (
          <div key={r.id} className={cn("flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors", i === 0 && "bg-muted/50")}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {r.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.profilePictureUrl} alt={r.employeeName} className="h-full w-full object-cover" />
              ) : (
                initials(r.employeeName)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{r.employeeName}</p>
              <p className="text-xs text-muted-foreground">
                {r.paidAt ? timeAgo(r.paidAt as Parameters<typeof timeAgo>[0]) : `${MONTH_LABELS[r.month]} ${r.year}`}
              </p>
            </div>
            <div className="flex-shrink-0 space-y-1 text-right">
              <p className="text-sm font-semibold text-foreground">{formatCurrency(r.netSalary)}</p>
              <PayrollStatusBadge status={r.payrollStatus} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
