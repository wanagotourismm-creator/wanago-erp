"use client";

import Link from "next/link";
import { ClipboardList, Receipt, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/helpers";
import type { PendingApprovalItem } from "@/modules/dashboard/hooks/useFinanceActionStats";

export function FinanceActionQueueCard({ items, loading }: { items: PendingApprovalItem[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-primary" />
          <CardTitle>Oldest Pending Approvals</CardTitle>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="All caught up" description="No pending invoice or expense approvals" icon={<span className="text-2xl">✅</span>} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.kind === "invoice" ? "/invoices" : "/expenses"}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 hover:border-primary/40 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.kind === "invoice" ? <FileText size={13} className="flex-shrink-0 text-muted-foreground" /> : <Receipt size={13} className="flex-shrink-0 text-muted-foreground" />}
                <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
              </div>
              <span className={cn(
                "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                item.daysOld >= 5 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {item.daysOld}d old
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
