"use client";

import {
  Users as UsersIcon, Building2, Trash2, Activity, History, CalendarDays,
  Megaphone, Download, Database, ShieldCheck, Settings2, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { UserProfile } from "@/modules/auth/types";
import type { Office } from "@/modules/admin/offices/types";
import type { TrashEntry } from "@/modules/admin/trash/types";
import type { CollectionHealth } from "@/modules/admin/health/services/health.service";
import type { ActivityLogEntry } from "@/lib/activity-log";

export type AdminTabKey =
  | "users" | "offices" | "activity" | "settings" | "permissions" | "integrations"
  | "export" | "announcements" | "holidays" | "assets" | "tickets" | "goals" | "health" | "trash" | "explorer";

type Props = {
  users:          UserProfile[];
  offices:        Office[];
  trash:          TrashEntry[];
  healthCollections: CollectionHealth[];
  recentActivity: ActivityLogEntry[];
  isSuperAdmin:   boolean;
  canManageUsers: boolean;
  canManageOffices: boolean;
  canManageSettings: boolean;
  onNavigate:     (tab: AdminTabKey) => void;
};

export function AdminOverview({
  users, offices, trash, healthCollections, recentActivity,
  isSuperAdmin, canManageUsers, canManageOffices, canManageSettings, onNavigate,
}: Props) {
  const activeUsers = users.filter(u => u.isActive).length;
  const healthOk = healthCollections.length === 0 || healthCollections.every(c => c.ok);

  const stats = [
    { label: "Team Members",  value: users.length,   sub: `${activeUsers} active`,        icon: UsersIcon,  color: "text-violet-500" },
    { label: "Offices",       value: offices.length,  sub: "branches configured",           icon: Building2,  color: "text-blue-500"   },
    { label: "Items in Trash",value: trash.length,    sub: "recoverable for 30 days",       icon: Trash2,     color: "text-amber-500"  },
    { label: "System Status", value: healthOk ? "OK" : "Issue", sub: "across all collections", icon: Activity, color: healthOk ? "text-green-500" : "text-red-500" },
  ];

  const allTools: { key: AdminTabKey; label: string; description: string; icon: React.ElementType; show: boolean }[] = [
    { key: "users",         label: "Users",               description: "Manage team accounts & roles",        icon: UsersIcon,   show: canManageUsers },
    { key: "offices",       label: "Offices",              description: "Branches & locations",                icon: Building2,   show: canManageOffices },
    { key: "permissions",   label: "Roles & Permissions",  description: "Customize what each role can do",     icon: ShieldCheck, show: isSuperAdmin },
    { key: "settings",      label: "Company Settings",     description: "Branding, tax, maintenance mode",     icon: Settings2,   show: canManageSettings },
    { key: "announcements", label: "Announcements",        description: "Broadcast to offices",                icon: Megaphone,   show: true },
    { key: "holidays",      label: "Holidays",              description: "Company holiday calendar",            icon: CalendarDays, show: true },
    { key: "export",        label: "Data Export",           description: "Download CSVs",                       icon: Download,     show: true },
    { key: "health",        label: "System Health",         description: "Collection counts & connectivity",    icon: Activity,     show: true },
    { key: "trash",         label: "Trash",                 description: "Restore or purge deleted records",    icon: Trash2,       show: isSuperAdmin },
    { key: "explorer",      label: "Collection Explorer",   description: "Raw database browser",                icon: Database,     show: isSuperAdmin },
    { key: "activity",      label: "Activity Log",          description: "Full audit trail",                    icon: History,      show: true },
  ];
  const tools = allTools.filter(t => t.show);

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label} · {s.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick launch tiles */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick Launch</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tools.map(t => (
              <button
                key={t.key}
                onClick={() => onNavigate(t.key)}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/50 hover:bg-muted/40 transition-colors"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <t.icon size={17} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{t.description}</p>
                </div>
                <ArrowRight size={14} className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</p>
            <button onClick={() => onNavigate("activity")} className="text-[11px] font-medium text-primary hover:text-primary/80">
              View all
            </button>
          </div>
          <div className="fluid-card rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {recentActivity.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">No activity yet</p>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity.slice(0, 6).map(a => (
                  <div key={a.id} className="px-4 py-2.5">
                    <p className={cn("truncate text-xs text-foreground")}>
                      <span className="font-semibold">{a.entityType}</span>: {a.detail}
                    </p>
                    <p className="text-[10px] text-muted-foreground">by {a.actorName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
