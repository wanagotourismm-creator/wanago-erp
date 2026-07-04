"use client";

import { Plus, Pencil, Trash2, RefreshCcw } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, cn, initials } from "@/lib/utils/helpers";
import type { ActivityLogEntry, ActivityAction } from "@/lib/activity-log";

const ACTION_ICONS: Record<ActivityAction, React.ElementType> = {
  created:        Plus,
  updated:        Pencil,
  deleted:        Trash2,
  status_changed: RefreshCcw,
};

const ACTION_STYLES: Record<ActivityAction, string> = {
  created:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  updated:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  deleted:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  status_changed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

type Props = {
  activity: ActivityLogEntry[];
  loading:  boolean;
};

export function ActivityLogTable({ activity, loading }: Props) {
  if (loading) return <SkeletonTable rows={8} />;

  if (activity.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Actions taken across the app will appear here"
        icon={<span className="text-2xl">📋</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="divide-y divide-border">
        {activity.map((entry) => {
          const Icon = ACTION_ICONS[entry.action] ?? Pencil;
          return (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl", ACTION_STYLES[entry.action])}>
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">
                  <span className="font-semibold">{entry.entityType}</span>: {entry.detail}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  by {entry.actorName} · {formatDate(entry.createdAt)}
                </p>
              </div>
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary" title={entry.actorName}>
                {initials(entry.actorName)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
