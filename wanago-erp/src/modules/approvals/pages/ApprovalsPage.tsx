"use client";

import { useState } from "react";
import { Inbox, RefreshCw, Wallet } from "lucide-react";
import { useApprovals } from "@/modules/approvals/hooks/useApprovals";
import { RejectReasonModal } from "@/modules/approvals/components/RejectReasonModal";
import { FinanceApprovalModal } from "@/modules/bookings/components/FinanceApprovalModal";
import { BookingDetailModal } from "@/modules/bookings/components/BookingDetailModal";
import { QuotationDetailModal } from "@/modules/quotations/components/QuotationDetailModal";
import { InvoiceDetailModal } from "@/modules/invoices/components/InvoiceDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { formatCurrency } from "@/lib/utils/helpers";
import type { ApprovalItem } from "@/modules/approvals/types";
import type { Booking } from "@/modules/bookings/types";
import type { Quotation } from "@/modules/quotations/types";
import type { Invoice } from "@/modules/invoices/types";

const KIND_META: Record<ApprovalItem["kind"], { label: string; variant: "info" | "warning" | "success" }> = {
  "booking-finance": { label: "Booking",   variant: "info"    },
  "booking-ops":     { label: "Booking",   variant: "info"    },
  "quotation":       { label: "Quotation", variant: "warning" },
  "invoice":         { label: "Invoice",   variant: "success" },
};

// Finance-only Approvals Inbox — Bookings pending Finance sign-off,
// Quotations/Invoices pending Finance approval. Operations approvals live
// on their own separate page/nav item (OperationsApprovalsPage) — the two
// are kept apart rather than sharing one page, since they're two different
// departments reviewing two different sets of requests.
export function ApprovalsPage() {
  const { user } = useAuthStore();
  const { financeQueue, loading, approveItem, rejectItem, reload } = useApprovals();

  const canSeeFinance = !!user && (
    hasPermission(user.systemRole, "bookings:finance_approve") ||
    hasPermission(user.systemRole, "quotations:finance_approve") ||
    hasPermission(user.systemRole, "invoices:finance_approve")
  );

  const [financeApprovingItem, setFinanceApprovingItem] = useState<ApprovalItem & { kind: "booking-finance" } | null>(null);
  const [rejectingItem,        setRejectingItem]        = useState<ApprovalItem | null>(null);
  const [viewingItem,          setViewingItem]          = useState<ApprovalItem | null>(null);

  async function handleApproveInline(item: ApprovalItem & { kind: "quotation" | "invoice" }) {
    await approveItem(item, user?.uid ?? "");
  }

  function renderRow(item: ApprovalItem) {
    const meta = KIND_META[item.kind];
    return (
      <div
        key={`${item.kind}-${item.id}`}
        onClick={() => setViewingItem(item)}
        className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant={meta.variant}>{meta.label}</Badge>
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
            onClick={() => {
              if (item.kind === "booking-finance") setFinanceApprovingItem(item);
              else handleApproveInline(item as ApprovalItem & { kind: "quotation" | "invoice" });
            }}
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
        title="Finance Approvals"
        tourId="tour-financeapprovals-header"
        description="Review pending bookings, quotations, and invoices awaiting Finance sign-off"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => reload()} data-tour-id="tour-financeapprovals-refresh">
            Refresh
          </Button>
        }
      />

      {canSeeFinance && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Finance Approvals</h2>
            <span className="text-xs text-muted-foreground">({financeQueue.length})</span>
          </div>
          {!loading && financeQueue.length === 0 ? (
            <EmptyState icon={<Inbox size={22} />} title="No pending Finance approvals" description="Bookings, quotations, and invoices awaiting Finance sign-off will appear here." />
          ) : (
            <div className="space-y-2">
              {financeQueue.map(renderRow)}
            </div>
          )}
        </section>
      )}

      <FinanceApprovalModal
        booking={financeApprovingItem ? (financeApprovingItem.data as Booking) : null}
        onClose={() => setFinanceApprovingItem(null)}
        onConfirm={(paymentVerification) =>
          financeApprovingItem ? approveItem(financeApprovingItem, paymentVerification) : Promise.resolve({ error: null })
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

      {/* Read-only full-detail viewers — same modals used everywhere else
          in the app, so Finance sees exactly what Sales entered before
          deciding. No manage/edit/delete/approve actions wired here; those
          stay on this page's own Approve/Reject buttons. */}
      <BookingDetailModal
        booking={viewingItem?.kind === "booking-finance" ? (viewingItem.data as Booking) : null}
        canManage={false}
        canApprove={false}
        onClose={() => setViewingItem(null)}
        onEdit={() => {}}
        onDelete={() => {}}
        onStatus={() => {}}
      />

      <QuotationDetailModal
        quotation={viewingItem?.kind === "quotation" ? (viewingItem.data as Quotation) : null}
        canEdit={false}
        canDelete={false}
        onClose={() => setViewingItem(null)}
        onEdit={() => {}}
        onDelete={() => {}}
        onConvert={() => {}}
      />

      <InvoiceDetailModal
        invoice={viewingItem?.kind === "invoice" ? (viewingItem.data as Invoice) : null}
        canManage={false}
        onClose={() => setViewingItem(null)}
        onEdit={() => {}}
        onDelete={() => {}}
        onSend={() => {}}
      />

    </div>
  );
}
