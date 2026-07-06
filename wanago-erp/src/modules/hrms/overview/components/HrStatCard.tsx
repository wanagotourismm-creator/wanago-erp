import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { Trend } from "@/modules/hrms/overview/hooks/useHrOverview";

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: Trend;
};

export function HrStatCard({ label, value, icon: Icon, trend }: Props) {
  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Icon size={16} className="text-primary" />
        </div>
        {trend && (
          <span className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            trend.direction === "up"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {trend.direction === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground truncate">{label}</p>
    </div>
  );
}
