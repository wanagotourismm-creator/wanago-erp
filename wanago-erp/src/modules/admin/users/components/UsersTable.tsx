"use client";

import { Edit2, Power } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { initials, cn } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import type { UserProfile } from "@/modules/auth/types";

type Props = {
  users:      UserProfile[];
  loading:    boolean;
  onEdit:     (user: UserProfile) => void;
  onToggle:   (user: UserProfile) => void;
};

export function UsersTable({ users, loading, onEdit, onToggle }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (users.length === 0) {
    return (
      <EmptyState
        title="No users yet"
        description="Add your first team member to get started"
        icon={<span className="text-2xl">👥</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["User", "Role", "Office", "Department", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.uid} className="hover:bg-muted/20 transition-colors group">

                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(u.displayName)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">{SYSTEM_ROLE_LABELS[u.systemRole] ?? u.systemRole}</p>
                    <p className="text-[11px] text-muted-foreground">{TEAM_ROLE_LABELS[u.teamRole] ?? u.teamRole}</p>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{u.officeName}</span>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{u.department || "—"}</span>
                </td>

                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    u.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => onEdit(u)}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => onToggle(u)}
                      title={u.isActive ? "Deactivate" : "Activate"}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                        u.isActive ? "text-destructive hover:bg-destructive/10" : "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                      )}
                    >
                      <Power size={13} />
                    </button>
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
