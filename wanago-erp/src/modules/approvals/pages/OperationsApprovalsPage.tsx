"use client";

import { useState, useEffect } from "react";
import { Inbox, RefreshCw, Briefcase } from "lucide-react";
import { useApprovals } from "@/modules/approvals/hooks/useApprovals";
import { RejectReasonModal } from "@/modules/approvals/components/RejectReasonModal";
import { OpsApprovalModal } from "@/modules/bookings/components/OpsApprovalModal";
import { BookingDetailModal } from "@/modules/bookings/components/BookingDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { formatCurrency } from "@/lib/utils/helpers";
import { fetchPackages } from "@/modules/packages/services/package.service";
import { fetchExpenses } from "@/modules/expenses/services/expense.service";
import type { ApprovalItem } from "@/modules/approvals/types";
import type { Booking } from "@/modules/bookings/types";
import type { Package } from "@/modules/packages/types";
import type { Expense } from "@/modules/expenses/types";

// Operations-only Approvals Inbox — Finance-approved bookings awaiting
// Operations sign-off. Kept as its own separate page/nav item under
// Operations rather than sharing the Finance Approvals page — the two
// departments review two different sets of requests.
export function OperationsApprovalsPage() {
  const { user } = useAuthStore();
  const { opsQueue, loading, approveItem, rejectItem, reload } = useApprovals();

  const canSeeOps = !!user && hasPermission(user.systemRole, "bookings:ops_approve");

  const [packages, setPackages] = useState<Package[]>([]);
  useEffect(() => { fetchPackages().then(setPackages).catch(() => {}); }, []);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  useEffect(() => { fetchExpenses().then(setExpenses).catch(() => {}); }, []);

  const [opsApprovingItem, setOpsApprovingItem] = useState<ApprovalItem & { kind: "booking-ops" } | null>(null);
  const [rejectingItem,    setRejectingItem]    = useState<ApprovalItem | null>(null);
  const [viewingItem,      setViewingItem]      = useState<ApprovalItem | null>(null);

  function renderRow(item: ApprovalItem) {
    return (
      <div
        key={`${item.kind}-${item.id}`}
        onClick={() => setViewingItem(item)}
        className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="info">Booking</Badge>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.refNumber} · {item.customerName}</p>
            {item.agentName && (
              <p className="truncate text-xs text-muted-foreground">Agent: {item.agentName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(item.amount)}</span>
          <Button size="sm" variant="outline" onClick={() => setViewingItem(item)}>
            View Details
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setOpsApprovingItem(item as ApprovalItem & { kind: "booking-ops" })}
          >
            Approve
          </Button>
          <Button size="sm" variant="danger" onClick={() => setRejectingItem(item)}>
            Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Operations Approvals"
        tourId="tour-opsapprovals-header"
        description="Review Finance-approved bookings awaiting Operations sign-off"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => reload()} data-tour-id="tour-opsapprovals-refresh">
            Refresh
          </Button>
        }
      />

      {canSeeOps && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Operations Approvals</h2>
            <span className="text-xs text-muted-foreground">({opsQueue.length})</span>
          </div>
          {!loading && opsQueue.length === 0 ? (
            <EmptyState icon={<Inbox size={22} />} title="No pending Operations approvals" description="Finance-approved bookings awaiting Operations sign-off will appear here." />
          ) : (
            <div className="space-y-2">
              {opsQueue.map(renderRow)}
            </div>
          )}
        </section>
      )}

      <OpsApprovalModal
        booking={opsApprovingItem ? (opsApprovingItem.data as Booking) : null}
        packages={packages}
        expenses={expenses}
        onClose={() => setOpsApprovingItem(null)}
        onConfirm={(profitAmount) =>
          opsApprovingItem ? approveItem(opsApprovingItem, profitAmount) : Promise.resolve({ error: null })
        }
      />

      <RejectReasonModal
        open={!!rejectingItem}
        itemLabel={rejectingItem?.refNumber ?? ""}
        onClose={() => setRejectingItem(null)}
        onReject={async (reason) => {
          if (!rejectingItem) return;
          const { error } = await rejectItem(rejectingItem, user?.uid ?? "", reason);
          if (error) throw new Error(error);
        }}
      />

      {/* Read-only full-detail viewer — same modal used everywhere else in
          the app, so Operations sees exactly what Sales/Finance entered
          before deciding. No manage/edit/delete/approve actions wired
          here; those stay on this page's own Approve/Reject buttons. */}
      <BookingDetailModal
        booking={viewingItem ? (viewingItem.data as Booking) : null}
        canManage={false}
        canDelete={false}
        canApprove={false}
        onClose={() => setViewingItem(null)}
        onEdit={() => {}}
        onDelete={() => {}}
        onStatus={() => {}}
      />

    </div>
  );
}
