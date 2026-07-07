"use client";

import { useState, useEffect } from "react";
import { Inbox, RefreshCw, Wallet, Briefcase } from "lucide-react";
import { useApprovals } from "@/modules/approvals/hooks/useApprovals";
import { RejectReasonModal } from "@/modules/approvals/components/RejectReasonModal";
import { FinanceApprovalModal } from "@/modules/bookings/components/FinanceApprovalModal";
import { OpsApprovalModal } from "@/modules/bookings/components/OpsApprovalModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { formatCurrency } from "@/lib/utils/helpers";
import { fetchPackages } from "@/modules/packages/services/package.service";
import type { ApprovalItem } from "@/modules/approvals/types";
import type { Booking } from "@/modules/bookings/types";
import type { Package } from "@/modules/packages/types";

const KIND_META: Record<ApprovalItem["kind"], { label: string; variant: "info" | "warning" | "success" }> = {
  "booking-finance": { label: "Booking",   variant: "info"    },
  "booking-ops":     { label: "Booking",   variant: "info"    },
  "quotation":       { label: "Quotation", variant: "warning" },
  "invoice":         { label: "Invoice",   variant: "success" },
};

export function ApprovalsPage() {
  const { user } = useAuthStore();
  const { financeQueue, opsQueue, loading, approveItem, rejectItem, reload } = useApprovals();

  const canSeeFinance = !!user && (
    hasPermission(user.systemRole, "bookings:finance_approve") ||
    hasPermission(user.systemRole, "quotations:finance_approve") ||
    hasPermission(user.systemRole, "invoices:finance_approve")
  );
  const canSeeOps = !!user && hasPermission(user.systemRole, "bookings:ops_approve");

  const [packages, setPackages] = useState<Package[]>([]);
  useEffect(() => { fetchPackages().then(setPackages).catch(() => {}); }, []);

  // Booking approvals need extra input (payment verification / profit
  // amount), so "Approve" opens the existing dedicated modals instead of
  // approving inline like quotations/invoices do.
  const [financeApprovingItem, setFinanceApprovingItem] = useState<ApprovalItem & { kind: "booking-finance" } | null>(null);
  const [opsApprovingItem,     setOpsApprovingItem]     = useState<ApprovalItem & { kind: "booking-ops" }     | null>(null);
  const [rejectingItem,        setRejectingItem]        = useState<ApprovalItem | null>(null);

  async function handleApproveInline(item: ApprovalItem & { kind: "quotation" | "invoice" }) {
    await approveItem(item, user?.uid ?? "");
  }

  function renderRow(item: ApprovalItem) {
    const meta = KIND_META[item.kind];
    return (
      <div key={`${item.kind}-${item.id}`} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.refNumber} · {item.customerName}</p>
            {item.agentName && (
              <p className="truncate text-xs text-muted-foreground">Agent: {item.agentName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-semibold text-foreground">{formatCurrency(item.amount)}</span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (item.kind === "booking-finance") setFinanceApprovingItem(item);
              else if (item.kind === "booking-ops") setOpsApprovingItem(item);
              else handleApproveInline(item);
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
        title="Approvals Inbox"
        description="Review pending bookings, quotations, and invoices awaiting Finance/Operations sign-off"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => reload()}>
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

      <FinanceApprovalModal
        booking={financeApprovingItem ? (financeApprovingItem.data as Booking) : null}
        onClose={() => setFinanceApprovingItem(null)}
        onConfirm={(paymentVerification) =>
          financeApprovingItem ? approveItem(financeApprovingItem, paymentVerification) : Promise.resolve({ error: null })
        }
      />

      <OpsApprovalModal
        booking={opsApprovingItem ? (opsApprovingItem.data as Booking) : null}
        packages={packages}
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

    </div>
  );
}
