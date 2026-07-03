"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Phone, Mail } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";

const STATUS_STYLES: Record<string, string> = {
  active:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  on_leave:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  resigned:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time", part_time: "Part Time",
  contract: "Contract", intern: "Intern", probation: "Probation",
};

type Props = {
  employees: Employee[];
  loading: boolean;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
};

export function EmployeeTable({ employees, loading, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={6} />;
  if (employees.length === 0) return <EmptyState title="No employees yet" description="Add your first employee to get started" icon={<span className="text-2xl">👥</span>} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Employee","Contact","Department","Type","Joined","Status",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map(e => (
              <tr key={e.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(e.fullName)}</div>
                    <div>
                      <p className="font-semibold text-foreground">{e.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">{e.employeeId} · {e.designation}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-foreground"><Phone size={11} className="text-muted-foreground" />{e.phone}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5"><Mail size={11} />{e.email}</div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-medium text-foreground">{e.department}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{TYPE_LABELS[e.employmentType] ?? e.employmentType}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{formatDate(e.dateOfJoining)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[e.employeeStatus] ?? "bg-muted text-muted-foreground")}>
                    {e.employeeStatus.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === e.id ? null : e.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal size={15} />
                    </button>
                    {menuOpen === e.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                          <button onClick={() => { onEdit(e); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"><Edit2 size={13} /> Edit</button>
                          <button onClick={() => { onDelete(e); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"><Trash2 size={13} /> Delete</button>
                        </div>
                      </>
                    )}
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
