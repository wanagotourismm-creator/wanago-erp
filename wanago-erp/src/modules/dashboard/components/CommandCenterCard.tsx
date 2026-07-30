"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { DocumentData } from "firebase/firestore";
import { Radar, FileText, Receipt, UserX, AlertTriangle, Target, type LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/helpers";
import { buildCommandCenter, type CommandCenterItem } from "@/modules/dashboard/services/command-center.service";
import type { Quotation } from "@/modules/quotations/types";

type Props = {
  leads:      DocumentData[] | null;
  quotations: Quotation[];
  invoices:   DocumentData[] | null;
  bookings:   DocumentData[] | null;
  loading:    boolean;
};

const ENTITY_ICON: Record<CommandCenterItem["entityType"], LucideIcon> = {
  lead: Target, quotation: FileText, invoice: Receipt, customer: UserX, booking: AlertTriangle,
};

const ENTITY_STYLE: Record<CommandCenterItem["entityType"], string> = {
  lead:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  quotation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  invoice:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  customer:  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  booking:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// One ranked, clickable "what needs attention today" list spanning leads,
// quotations, invoices, and customers — see command-center.service.ts for
// how each signal is derived. Purely props-driven (same pattern as
// InsightsCard/FinanceActionQueueCard) — no fetching of its own, reuses
// whatever the dashboard already loaded.
export function CommandCenterCard({ leads, quotations, invoices, bookings, loading }: Props) {
  const items = useMemo(
    () => buildCommandCenter({
      leads: leads ?? [], quotations, invoices: invoices ?? [], bookings: bookings ?? [],
    }),
    [leads, quotations, invoices, bookings]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radar size={16} className="text-primary" />
          <div>
            <CardTitle>Command Center</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">What needs attention today, across the whole pipeline</p>
          </div>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="All caught up" description="Nothing urgent right now" icon={<span className="text-2xl">🎉</span>} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = ENTITY_ICON[item.entityType];
            return (
              <Link
                key={`${item.entityType}-${item.id}`}
                href={item.link}
                className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary/40 hover:bg-muted/30 transition-colors"
              >
                <span className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full", ENTITY_STYLE[item.entityType])}>
                  <Icon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
