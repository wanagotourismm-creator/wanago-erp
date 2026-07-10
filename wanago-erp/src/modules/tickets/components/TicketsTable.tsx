"use client";

import { Trash2, UserCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate } from "@/lib/utils/helpers";
import { TicketPriorityBadge, TicketStatusBadge, TICKET_STATUS_LABELS } from "@/modules/tickets/components/TicketBadges";
import type { Ticket, TicketStatus } from "@/modules/tickets/types";

type Props = {
  tickets: Ticket[];
  loading: boolean;
  canDelete: boolean;
  onView: (t: Ticket) => void;
  onSetStatus: (t: Ticket, status: TicketStatus) => void;
  onAssignToMe: (t: Ticket) => void;
  onDelete: (t: Ticket) => void;
};

export function TicketsTable({ tickets, loading, canDelete, onView, onSetStatus, onAssignToMe, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;
  if (tickets.length === 0) return <EmptyState title="No tickets reported" description="Issues employees report will show up here" icon={<span className="text-2xl">🎫</span>} />;

  return (
    <>
    <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                    {canDelete && (
                      <button onClick={(e) => { e.stopPropagation(); onDelete(t); }} title="Delete" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="sm:hidden space-y-2.5">
      {tickets.map((t) => {
        const actions: SwipeAction[] = [
          { key: "assign", icon: <UserCheck size={16} />, label: "Assign", onClick: () => onAssignToMe(t), className: "bg-primary" },
          ...(canDelete ? [{ key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(t), className: "bg-red-600" }] : []),
        ];
        return (
          <SwipeableRow key={t.id} actions={actions} onTap={() => onView(t)} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">{t.refNumber}</p>
                </div>
                <TicketPriorityBadge priority={t.priority} />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <TicketStatusBadge status={t.ticketStatus} />
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(t.createdAt)}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {t.reportedByName} · {t.assignedToName || "Unassigned"}
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
