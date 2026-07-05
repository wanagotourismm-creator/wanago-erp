"use client";

import { Trash2, UserCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils/helpers";
import { TicketPriorityBadge, TICKET_STATUS_LABELS } from "@/modules/tickets/components/TicketBadges";
import type { Ticket, TicketStatus } from "@/modules/tickets/types";

type Props = {
  tickets: Ticket[];
  loading: boolean;
  onView: (t: Ticket) => void;
  onSetStatus: (t: Ticket, status: TicketStatus) => void;
  onAssignToMe: (t: Ticket) => void;
  onDelete: (t: Ticket) => void;
};

export function TicketsTable({ tickets, loading, onView, onSetStatus, onAssignToMe, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;
  if (tickets.length === 0) return <EmptyState title="No tickets reported" description="Issues employees report will show up here" icon={<span className="text-2xl">🎫</span>} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Ticket", "Reported By", "Category", "Priority", "Status", "Assigned To", "Date", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map((t) => (
              <tr key={t.id} onClick={() => onView(t)} className="cursor-pointer hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3 max-w-[220px]">
                  <p className="font-medium text-foreground truncate" title={t.title}>{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">{t.refNumber}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.reportedByName}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.category}</td>
                <td className="px-4 py-3"><TicketPriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3">
                  <select value={t.ticketStatus} onChange={(e) => onSetStatus(t, e.target.value as TicketStatus)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none hover:border-primary/40">
                    {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.assignedToName || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(t.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onAssignToMe(t); }} title="Assign to me" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"><UserCheck size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t); }} title="Delete" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
