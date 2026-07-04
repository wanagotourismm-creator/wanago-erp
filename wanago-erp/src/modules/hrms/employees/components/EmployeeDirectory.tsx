"use client";

import { Mail, Phone, MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { EmployeeStatusBadge } from "@/modules/hrms/employees/components/EmployeeBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { initials } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";

type Props = {
  employees: Employee[];
  loading:   boolean;
  canManage: boolean;
  onView:    (employee: Employee) => void;
  onEdit:    (employee: Employee) => void;
  onDelete:  (employee: Employee) => void;
};

export function EmployeeDirectory({ employees, loading, canManage, onView, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={6} />;

  if (employees.length === 0) {
    return (
      <EmptyState
        title="No employees yet"
        description="Add your first employee to get started"
        icon={<span className="text-2xl">🧑‍💼</span>}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {employees.map(emp => (
        <div key={emp.id} className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex items-start justify-between">
            <button onClick={() => onView(emp)} className="flex items-center gap-3 text-left">
              {emp.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={emp.profilePictureUrl} alt={emp.fullName} className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {initials(emp.fullName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{emp.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{emp.designation}</p>
                <p className="text-[11px] text-muted-foreground/70">{emp.employeeCode}</p>
              </div>
            </button>

            {canManage && (
              <div className="relative flex-shrink-0">
                <button onClick={() => setMenuOpen(menuOpen === emp.id ? null : emp.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                  <MoreVertical size={15} />
                </button>
                {menuOpen === emp.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                      <button onClick={() => { onView(emp); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                        <Eye size={13} /> View Profile
                      </button>
                      <button onClick={() => { onEdit(emp); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                        <Edit2 size={13} /> Edit
                      </button>
                      <button onClick={() => { onDelete(emp); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Phone size={12} /> {emp.mobileNumber}
            </div>
            {emp.email && (
              <div className="flex items-center gap-1.5 truncate">
                <Mail size={12} /> {emp.email}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-[11px] text-muted-foreground">{emp.department}</span>
            <EmployeeStatusBadge status={emp.employeeStatus} />
          </div>
        </div>
      ))}
    </div>
  );
}
