"use client";

import { Activity as ActivityIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/utils/helpers";
import type { ActivityLogEntry } from "@/lib/activity-log";

export function MyActivityList({ activity }: { activity: ActivityLogEntry[] }) {
  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <ActivityIcon size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">My Activity</p>
          <p className="text-xs text-muted-foreground">Your recent actions in the system</p>
        </div>
      </div>

      {activity.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions you take will show up here" icon={<span className="text-2xl">📋</span>} />
      ) : (
        <div className="space-y-2">
          {activity.slice(0, 20).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{a.detail}</p>
                <p className="text-xs text-muted-foreground">{a.entityType} · {a.action.replace("_", " ")}</p>
              </div>
              <span className="flex-shrink-0 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
