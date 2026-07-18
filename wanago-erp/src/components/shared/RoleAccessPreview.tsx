"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { fetchRolePermissions } from "@/modules/admin/permissions/services/permissions.service";
import { PERMISSION_GROUPS, PAGE_ACCESS } from "@/lib/rbac";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";
import type { SystemRole, PermissionMap } from "@/types/rbac";

type Props = {
  role: SystemRole;
};

function formatPermission(permission: string): string {
  return permission.split(":")[1]?.replace(/_/g, " ") ?? permission;
}

// Read-only "what does this role actually get" summary, shown next to a
// System Role picker (Add User, or Add Employee's "create login" step) so
// whoever's granting access can see the consequence of the role they're
// about to pick, instead of finding out after the fact. Reads the same
// admin-configurable permission map (settings/rolePermissions, falling back
// to the static PERMISSION_MAP) the Roles & Permissions screen edits, so
// this stays accurate if that screen's toggles are ever changed.
export function RoleAccessPreview({ role }: Props) {
  const [map, setMap] = useState<PermissionMap | null>(null);

  useEffect(() => {
    fetchRolePermissions().then(setMap).catch(() => {});
  }, []);

  if (!map) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 size={12} className="animate-spin" /> Loading access preview...
      </div>
    );
  }

  const perms = (map[role] ?? []) as string[];
  const isFullAccess = perms.includes("*");
  const pages = PAGE_ACCESS[role] ?? [];

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <ShieldCheck size={12} className="text-primary" />
        What {SYSTEM_ROLE_LABELS[role]} can access
      </div>

      {isFullAccess ? (
        <p className="text-xs text-foreground">Full access to everything (Super Admin).</p>
      ) : (
        <div className="space-y-1">
          {PERMISSION_GROUPS.map((group) => {
            const granted = group.permissions.filter((p) => perms.includes(p));
            if (granted.length === 0) return null;
            return (
              <div key={group.label} className="text-xs">
                <span className="font-medium text-foreground">{group.label}: </span>
                <span className="text-muted-foreground">{granted.map(formatPermission).join(", ")}</span>
              </div>
            );
          })}
          {perms.length === 0 && (
            <p className="text-xs text-muted-foreground">No permissions granted to this role yet.</p>
          )}
        </div>
      )}

      {!isFullAccess && pages.length > 0 && !pages.includes("*") && (
        <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
          Pages: {pages.join(", ")}
        </p>
      )}
    </div>
  );
}
