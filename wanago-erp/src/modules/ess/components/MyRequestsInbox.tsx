"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, toDate, cn } from "@/lib/utils/helpers";
import { LeaveStatusBadge } from "@/modules/hrms/leaves/components/LeaveBadges";
import type { Timestamp } from "@/types/global";
import type { LeaveRequest, AttendanceRegularization, AttendanceRecord } from "@/modules/hrms/shared/types";
import type { AssetRequest } from "@/modules/assets/types";

type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

type MyRequestItem = {
  id: string;
  kind: "leave" | "regularization" | "asset" | "location";
  createdAt: Timestamp | Date | string;
  status: RequestStatus;
  summary: string;
  comments: string | null;
};

type Props = {
  leaves: LeaveRequest[];
  regularizations: AttendanceRegularization[];
  assetRequests: AssetRequest[];
  attendance: AttendanceRecord[];
};

const KIND_LABELS: Record<MyRequestItem["kind"], string> = {
  leave: "Leave", regularization: "Correction", asset: "Asset", location: "Location",
};

const KIND_STYLES: Record<MyRequestItem["kind"], string> = {
  leave:          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  regularization: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  asset:          "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  location:       "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const FILTERS = ["All", "Pending", "Approved", "Rejected"] as const;

// One consolidated, read-only history across every request type an
// employee can submit — leave/correction/asset requests plus attendance
// records that ever went through location approval — so they don't have
// to check My Leaves, Attendance, and My Assets separately just to see
// where something stands. Unlike the manager's Team Inbox (InboxCard),
// this shows every status, not just pending, since it's a history view
// rather than a decision queue.
export function MyRequestsInbox({ leaves, regularizations, assetRequests, attendance }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const items: MyRequestItem[] = useMemo(() => {
    const leaveItems: MyRequestItem[] = leaves.map((l) => ({
      id: `leave_${l.id}`, kind: "leave", createdAt: l.createdAt,
      status: l.status, comments: l.comments,
      summary: `${l.leaveType.replace("_", " ")} leave · ${formatDate(l.fromDate)} – ${formatDate(l.toDate)}`,
    }));
    const regItems: MyRequestItem[] = regularizations.map((r) => ({
      id: `reg_${r.id}`, kind: "regularization", createdAt: r.createdAt,
      status: r.regularizationStatus, comments: r.comments,
      summary: `Attendance correction for ${formatDate(r.date)}`,
    }));
    const assetItems: MyRequestItem[] = assetRequests.map((r) => ({
      id: `asset_${r.id}`, kind: "asset", createdAt: r.createdAt,
      status: r.requestStatus, comments: r.comments,
      summary: `${r.assetCategory} · ${r.reason}`,
    }));
    const locationItems: MyRequestItem[] = attendance
      .filter((a) => a.locationApprovalStatus != null)
      .map((a) => ({
        id: `location_${a.id}`, kind: "location", createdAt: a.createdAt,
        status: a.locationApprovalStatus as RequestStatus, comments: a.locationDecisionComments,
        summary: `Attendance location for ${formatDate(a.date)}`
          + (a.distanceFromOfficeMeters != null ? ` · ${(a.distanceFromOfficeMeters / 1000).toFixed(1)} km away` : ""),
      }));
    return [...leaveItems, ...regItems, ...assetItems, ...locationItems].sort(
      (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)
    );
  }, [leaves, regularizations, assetRequests, attendance]);

  const filtered = useMemo(
    () => items.filter((i) => filter === "All" || i.status === filter.toLowerCase()),
    [items, filter]
  );

  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Inbox size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Requests Inbox</p>
            <p className="text-xs text-muted-foreground">{items.length} total request{items.length === 1 ? "" : "s"}</p>
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
        <EmptyState
          title="No requests yet"
          description="Leave, correction, asset, and location requests you submit will show up here"
          icon={<span className="text-2xl">📋</span>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-border px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", KIND_STYLES[item.kind])}>
                      {KIND_LABELS[item.kind]}
                    </span>
                    <LeaveStatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-foreground truncate">{item.summary}</p>
                  {item.comments && (
                    <p className="mt-1 text-[11px] text-muted-foreground italic truncate" title={item.comments}>
                      &ldquo;{item.comments}&rdquo;
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-[11px] text-muted-foreground" title="Submitted">
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
