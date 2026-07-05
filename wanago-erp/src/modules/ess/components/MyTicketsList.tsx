"use client";

import { LifeBuoy, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils/helpers";
import { TicketPriorityBadge, TicketStatusBadge } from "@/modules/tickets/components/TicketBadges";
import type { Ticket } from "@/modules/tickets/types";

type Props = {
  tickets: Ticket[];
  onReport: () => void;
};

export function MyTicketsList({ tickets, onReport }: Props) {
  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <LifeBuoy size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">IT Support</p>
            <p className="text-xs text-muted-foreground">{tickets.length} ticket{tickets.length === 1 ? "" : "s"} reported</p>
          </div>
        </div>
        <button onClick={onReport}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm">
          <Plus size={13} /> Report Issue
        </button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets reported" description="Report a bug, hardware issue, or access request" icon={<span className="text-2xl">🎫</span>} />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-xl border border-border px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">{t.refNumber}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <TicketPriorityBadge priority={t.priority} />
                <TicketStatusBadge status={t.ticketStatus} />
                <span className="text-xs text-muted-foreground">{t.category} · {formatDate(t.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
