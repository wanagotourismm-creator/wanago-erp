"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/helpers";
import type { DayBucket } from "@/modules/dashboard/hooks/useAttendanceSummary";

const LEVELS = 4;

function levelFor(hours: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(LEVELS, Math.ceil((hours / max) * LEVELS));
}

type Props = { days: DayBucket[]; weeklyAvgHours: number };

export function AvgHoursWeekCard({ days, weeklyAvgHours }: Props) {
  const max = Math.max(...days.map((d) => d.avgHours), 1);

  return (
    <Card radius="3xl">
      <div className="mb-1 flex items-center gap-2">
        <p className="text-3xl font-bold text-foreground">{weeklyAvgHours.toFixed(1)}</p>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
          avg/day
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Hours worked · last 7 days</p>

      {days.length > 0 ? (
        <>
          <div className="flex items-end justify-between gap-2">
            {days.map((d) => {
              const level = levelFor(d.avgHours, max);
              return (
                <div key={d.date} className="flex flex-col items-center gap-1.5">
                  {Array.from({ length: LEVELS }).map((_, i) => {
                    const filled = LEVELS - i <= level;
                    return (
                      <span
                        key={i}
                        className={cn("h-2.5 w-2.5 rounded-full", filled ? "bg-primary" : "bg-muted")}
                        style={filled ? { opacity: 0.4 + (0.6 * (LEVELS - i)) / LEVELS } : undefined}
                      />
                    );
                  })}
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(d.date).toLocaleDateString("en-US", { weekday: "narrow" })}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Fewer hours</span>
            <div className="flex gap-1">
              {Array.from({ length: LEVELS }).map((_, i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-primary" style={{ opacity: 0.4 + (0.6 * (i + 1)) / LEVELS }} />
              ))}
            </div>
            <span>More hours</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No attendance data yet</p>
      )}
    </Card>
  );
}
