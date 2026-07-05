"use client";

import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/helpers";
import { MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";

type Props = {
  basicSalary: number;
  bonus: number;
  incentives: number;
  netSalary: number;
  employeeCount: number;
  month?: number;
  year?: number;
};

export function PayrollSummaryCard({ basicSalary, bonus, incentives, netSalary, employeeCount, month, year }: Props) {
  const pct = netSalary > 0 ? Math.round(((basicSalary + bonus + incentives) / netSalary) * 100) : 0;

  return (
    <Card tone="dark" radius="3xl">
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-dark-surface-foreground/60">
        {month && year ? `${MONTH_LABELS[month]} ${year}` : "Payroll Summary"}
      </p>
      <p className="mb-4 text-[11px] text-dark-surface-foreground/40">
        Total across {employeeCount} employee{employeeCount !== 1 ? "s" : ""}
      </p>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-primary/90 px-3 py-2.5">
          <span className="text-xs font-medium text-white">Basic Salary</span>
          <span className="text-sm font-semibold text-white">{formatCurrency(basicSalary)}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
          <span className="text-xs font-medium text-dark-surface-foreground/80">Perform</span>
          <span className="text-sm font-semibold text-dark-surface-foreground">{formatCurrency(bonus)}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
          <span className="text-xs font-medium text-dark-surface-foreground/80">Gift</span>
          <span className="text-sm font-semibold text-dark-surface-foreground">{formatCurrency(incentives)}</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-dark-surface-foreground/50">Take Home Pay</p>
          <p className="text-xl font-bold text-dark-surface-foreground">{formatCurrency(netSalary)}</p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-dark-surface-foreground/80">
          {pct}% payout
        </span>
      </div>
    </Card>
  );
}
