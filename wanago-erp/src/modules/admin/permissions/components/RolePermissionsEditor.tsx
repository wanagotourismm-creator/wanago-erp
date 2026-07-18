"use client";

import { Fragment, useState, useEffect } from "react";
import { Loader2, Save, Check } from "lucide-react";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";
import { Switch } from "@/components/ui/Switch";
import type { Permission, PermissionMap, SystemRole } from "@/types/rbac";

type Props = {
  map:    PermissionMap;
  saving: boolean;
  onSave: (map: PermissionMap) => Promise<{ error: string | null }>;
};

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Leads",     permissions: ["leads:view_all", "leads:view_own", "leads:create", "leads:edit", "leads:delete"] },
  { label: "Customers", permissions: ["customers:view_all", "customers:view_own", "customers:create", "customers:edit", "customers:delete"] },
  { label: "Bookings",  permissions: ["bookings:view_all", "bookings:view_own", "bookings:create", "bookings:edit", "bookings:delete", "bookings:approve"] },
  { label: "Finance",   permissions: ["finance:view", "finance:create", "finance:edit", "finance:export"] },
  { label: "HRMS",      permissions: ["hrms:view_all", "hrms:view_own", "hrms:manage"] },
  { label: "Admin",     permissions: ["admin:settings", "admin:users", "admin:offices"] },
  { label: "Reports",   permissions: ["reports:view", "reports:export"] },
];

const EDITABLE_ROLES: SystemRole[] = ["admin", "operations", "marketing", "finance", "hr", "sales", "support"];

export function RolePermissionsEditor({ map, saving, onSave }: Props) {
  const [draft, setDraft] = useState<PermissionMap>(map);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setDraft(map); }, [map]);

  function toggle(role: SystemRole, permission: Permission) {
    setSaved(false);
    setDraft(prev => {
      const current = prev[role] ?? [];
      const has = current.includes(permission);
      return {
        ...prev,
        [role]: has ? current.filter(p => p !== permission) : [...current, permission],
      };
    });
  }

  async function handleSave() {
    setError(null);
    const result = await onSave(draft);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        Super Admin always has full access (&quot;*&quot;) and isn&apos;t shown here. Changes apply immediately after saving.
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Permission</th>
                {EDITABLE_ROLES.map(role => (
                  <th key={role} className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {SYSTEM_ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PERMISSION_GROUPS.map(group => (
                <Fragment key={group.label}>
                  <tr className="bg-muted/10">
                    <td colSpan={EDITABLE_ROLES.length + 1} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
                      {group.label}
                    </td>
                  </tr>
                  {group.permissions.map(perm => (
                    <tr key={perm} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2 text-xs text-foreground font-mono">{perm}</td>
                      {EDITABLE_ROLES.map(role => (
                        <td key={role} className="px-3 py-2 text-center">
                          <Switch
                            className="justify-center"
                            checked={(draft[role] ?? []).includes(perm)}
                            onChange={() => toggle(role, perm)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <Check size={13} /> Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Permissions
        </button>
      </div>
    </div>
  );
}
