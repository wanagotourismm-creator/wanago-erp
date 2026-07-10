"use client";

import { Target } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatDate } from "@/lib/utils/helpers";
import type { RelevantObjective } from "@/modules/dashboard/hooks/useRelevantCompanyGoals";

const STATUS_STYLES: Record<string, string> = {
  on_track:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  at_risk:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  off_track: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  done:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUS_LABELS: Record<string, string> = {
  on_track: "On Track", at_risk: "At Risk", off_track: "Off Track", done: "Done",
};

// Shows the employee the slice of the company's active OKRs that involves
// them (their department, or objectives they personally own) — ties their
// day-to-day work back to what the company is actually working toward,
// instead of leaving company goals as an admin-only screen they never see.
export function RelevantGoalsCard({ objectives, loading }: { objectives: RelevantObjective[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary" />
          <CardTitle>How You&apos;re Contributing to Company Goals</CardTitle>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : objectives.length === 0 ? (
        <EmptyState
          title="No linked objectives yet"
          description="When your department gets an objective on a company goal, it'll show up here."
          icon={<span className="text-2xl">🎯</span>}
        />
      ) : (
        <div className="space-y-3">
          {objectives.map((o) => (
            <div key={o.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{o.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{o.goalTitle}</p>
                </div>
                <span className={cn("flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[o.objectiveStatus])}>
                  {STATUS_LABELS[o.objectiveStatus]}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(o.progressPercent, 100)}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{o.progressPercent}% complete</span>
                <span>Due {formatDate(o.dueDate)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
