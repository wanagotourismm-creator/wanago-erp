"use client";

import { useMemo, useState } from "react";
import { Inbox, Check, X as XIcon, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import { LeaveTypeBadge } from "@/modules/hrms/leaves/components/LeaveBadges";
import type { InboxItem } from "@/modules/ess/hooks/useEss";

type Props = {
  items: InboxItem[];
  onDecide: (item: InboxItem, decision: "approve" | "reject") => Promise<{ error: string | null }>;
};

const FILTERS = ["All", "Leave", "Regularization"] as const;

export function InboxCard({ items, onDecide }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => items.filter((i) => {
    if (filter === "All") return true;
    if (filter === "Leave") return i.kind === "leave";
    return i.kind === "regularization";
  }), [items, filter]);

  async function handle(item: InboxItem, decision: "approve" | "reject") {
    setBusyId(item.id);
    await onDecide(item, decision);
    setBusyId(null);
  }

  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Inbox size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Team Inbox</p>
            <p className="text-xs text-muted-foreground">Pending requests from your direct reports</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === f ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted")}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="All caught up" description="No pending requests from your team" icon={<span className="text-2xl">✅</span>} />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const name = item.kind === "leave" ? item.leave.employeeName : item.regularization.employeeName;
            return (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                    {item.kind === "leave" ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <LeaveTypeBadge type={item.leave.leaveType} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.leave.fromDate)} – {formatDate(item.leave.toDate)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center rounded-full bg-cyan-100 dark:bg-cyan-900/30 px-2.5 py-0.5 text-xs font-medium text-cyan-700 dark:text-cyan-400">Correction</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.regularization.date)}
                          {item.regularization.requestedClockIn && ` · ${item.regularization.requestedClockIn}`}
                          {item.regularization.requestedClockOut && ` – ${item.regularization.requestedClockOut}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {busyId === item.id ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <button onClick={() => handle(item, "approve")} title="Approve"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <Check size={15} />
                      </button>
                      <button onClick={() => handle(item, "reject")} title="Reject"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <XIcon size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
