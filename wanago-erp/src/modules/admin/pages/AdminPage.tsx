"use client";

import { useState } from "react";
import {
  Plus, RefreshCw, Users as UsersIcon, Building2, History, Settings2, ShieldCheck,
  Download, Megaphone, CalendarDays, Activity, Trash2, Database, LayoutGrid, Laptop,
} from "lucide-react";
import { useAdminUsers } from "@/modules/admin/users/hooks/useAdminUsers";
import { useOffices } from "@/modules/admin/offices/hooks/useOffices";
import { useActivityLog } from "@/modules/admin/activity/hooks/useActivityLog";
import { useCompanySettings } from "@/modules/admin/settings/hooks/useCompanySettings";
import { useRolePermissions } from "@/modules/admin/permissions/hooks/useRolePermissions";
import { useTrash } from "@/modules/admin/trash/hooks/useTrash";
import { useSystemHealth } from "@/modules/admin/health/hooks/useSystemHealth";
import { UsersTable } from "@/modules/admin/users/components/UsersTable";
import { UserForm } from "@/modules/admin/users/components/UserForm";
import { BulkUserActions } from "@/modules/admin/users/components/BulkUserActions";
import { OfficesTable } from "@/modules/admin/offices/components/OfficesTable";
import { OfficeForm } from "@/modules/admin/offices/components/OfficeForm";
import { ActivityLogTable } from "@/modules/admin/activity/components/ActivityLogTable";
import { CompanySettingsForm } from "@/modules/admin/settings/components/CompanySettingsForm";
import { RolePermissionsEditor } from "@/modules/admin/permissions/components/RolePermissionsEditor";
import { DataExportPanel } from "@/modules/admin/export/components/DataExportPanel";
import { AnnouncementComposer } from "@/modules/admin/announcements/components/AnnouncementComposer";
import { HolidayCalendar } from "@/modules/admin/holidays/components/HolidayCalendar";
import { AssetsPanel } from "@/modules/assets/components/AssetsPanel";
import { SystemHealthPanel } from "@/modules/admin/health/components/SystemHealthPanel";
import { TrashPanel } from "@/modules/admin/trash/components/TrashPanel";
import { CollectionExplorer } from "@/modules/admin/explorer/components/CollectionExplorer";
import { AdminOverview, type AdminTabKey } from "@/modules/admin/overview/components/AdminOverview";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";
import type { UserProfile } from "@/modules/auth/types";
import type { Office } from "@/modules/admin/offices/types";

type Tab = "overview" | AdminTabKey;

type NavItem = { key: Tab; label: string; icon: React.ElementType; show: boolean };
type NavGroup = { label: string; items: NavItem[] };

function DarkButton({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
    >
      {icon}
      {children}
    </button>
  );
}

export function AdminPage() {
  const { user } = useAuthStore();
  const canManageUsers    = !!user && hasPermission(user.systemRole, "admin:users");
  const canManageOffices  = !!user && hasPermission(user.systemRole, "admin:offices");
  const canManageSettings = !!user && hasPermission(user.systemRole, "admin:settings");
  const isSuperAdmin = user?.systemRole === "super_admin";

  const [tab, setTab] = useState<Tab>("overview");

  const {
    users, loading: usersLoading, addUser, editUser, toggleActive, bulkUpdate, load: loadUsers,
  } = useAdminUsers();
  const {
    offices, loading: officesLoading, addOffice, editOffice, removeOffice, load: loadOffices,
  } = useOffices();
  const { activity, loading: activityLoading, load: loadActivity } = useActivityLog();
  const { settings, loading: settingsLoading, saving: settingsSaving, save: saveSettings } = useCompanySettings();
  const { map: permissionMap, loading: permissionsLoading, saving: permissionsSaving, save: savePermissions } = useRolePermissions();
  const { entries: trashEntries } = useTrash();
  const { collections: healthCollections } = useSystemHealth();

  const [userFormOpen,   setUserFormOpen]   = useState(false);
  const [editingUser,    setEditingUser]    = useState<UserProfile | null>(null);
  const [officeFormOpen, setOfficeFormOpen] = useState(false);
  const [editingOffice,  setEditingOffice]  = useState<Office | null>(null);
  const [selectedUsers,  setSelectedUsers]  = useState<string[]>([]);

  async function handleToggleActive(u: UserProfile) {
    const action = u.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} "${u.displayName}"?`)) return;
    await toggleActive(u.uid, !u.isActive);
  }

  async function handleDeleteOffice(office: Office) {
    if (!confirm(`Delete office "${office.name}"? This cannot be undone.`)) return;
    await removeOffice(office.id);
  }

  const navGroups: NavGroup[] = [
    { label: "", items: [{ key: "overview", label: "Overview", icon: LayoutGrid, show: true }] },
    { label: "People", items: [
      { key: "users",   label: "Users",   icon: UsersIcon, show: canManageUsers },
      { key: "offices", label: "Offices", icon: Building2, show: canManageOffices },
    ] },
    { label: "Communication", items: [
      { key: "announcements", label: "Announcements", icon: Megaphone,    show: true },
      { key: "holidays",      label: "Holidays",       icon: CalendarDays, show: true },
    ] },
    { label: "HR Operations", items: [
      { key: "assets", label: "Assets", icon: Laptop, show: true },
    ] },
    { label: "Configuration", items: [
      { key: "settings",    label: "Company Settings",    icon: Settings2,   show: canManageSettings },
      { key: "permissions", label: "Roles & Permissions", icon: ShieldCheck, show: isSuperAdmin },
    ] },
    { label: "Data & Monitoring", items: [
      { key: "export",   label: "Data Export",   icon: Download, show: true },
      { key: "health",   label: "System Health", icon: Activity, show: true },
      { key: "activity", label: "Activity Log",  icon: History,  show: true },
    ] },
    { label: "Danger Zone", items: [
      { key: "trash",    label: "Trash",               icon: Trash2,   show: isSuperAdmin },
      { key: "explorer", label: "Collection Explorer", icon: Database, show: isSuperAdmin },
    ] },
  ];

  const healthOk = healthCollections.length === 0 || healthCollections.every(c => c.ok);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-xl">

      {/* Command bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
            <ShieldCheck size={19} className="text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Command Center</p>
            <h1 className="text-lg font-bold text-white leading-tight">Admin</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            healthOk ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", healthOk ? "bg-green-400" : "bg-red-400")} />
            {healthOk ? "All systems operational" : "Attention needed"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
            {user ? SYSTEM_ROLE_LABELS[user.systemRole] : ""}
          </span>

          {tab === "users" && (
            <>
              <DarkButton icon={<RefreshCw size={13} />} onClick={() => loadUsers()}>Refresh</DarkButton>
              {canManageUsers && (
                <Button size="sm" icon={<Plus size={13} />} onClick={() => { setEditingUser(null); setUserFormOpen(true); }}>
                  Add User
                </Button>
              )}
            </>
          )}
          {tab === "offices" && (
            <>
              <DarkButton icon={<RefreshCw size={13} />} onClick={() => loadOffices()}>Refresh</DarkButton>
              {canManageOffices && (
                <Button size="sm" icon={<Plus size={13} />} onClick={() => { setEditingOffice(null); setOfficeFormOpen(true); }}>
                  Add Office
                </Button>
              )}
            </>
          )}
          {tab === "activity" && (
            <DarkButton icon={<RefreshCw size={13} />} onClick={() => loadActivity()}>Refresh</DarkButton>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">

        {/* Sidebar nav */}
        <nav className="flex flex-shrink-0 gap-4 overflow-x-auto border-b border-white/10 bg-slate-950/60 p-3 lg:w-56 lg:flex-col lg:gap-5 lg:overflow-visible lg:border-b-0 lg:border-r">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(i => i.show);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label || "root"} className="flex flex-shrink-0 flex-col gap-1">
                {group.label && (
                  <p className="hidden px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 lg:block">{group.label}</p>
                )}
                <div className="flex gap-1 lg:flex-col">
                  {visibleItems.map(item => (
                    <button
                      key={item.key}
                      onClick={() => setTab(item.key)}
                      className={cn(
                        "flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                        tab === item.key
                          ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      )}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 bg-background p-6">

          {tab === "overview" && (
            <AdminOverview
              users={users}
              offices={offices}
              trash={trashEntries}
              healthCollections={healthCollections}
              recentActivity={activity}
              isSuperAdmin={isSuperAdmin}
              canManageUsers={canManageUsers}
              canManageOffices={canManageOffices}
              canManageSettings={canManageSettings}
              onNavigate={setTab}
            />
          )}

          {tab === "users" && canManageUsers && (
            <div className="space-y-3">
              {selectedUsers.length > 0 && (
                <BulkUserActions
                  count={selectedUsers.length}
                  offices={offices}
                  onClear={() => setSelectedUsers([])}
                  onApply={async (data) => { await bulkUpdate(selectedUsers, data); }}
                />
              )}
              <UsersTable
                users={users}
                loading={usersLoading}
                selected={selectedUsers}
                onSelect={setSelectedUsers}
                onEdit={(u) => { setEditingUser(u); setUserFormOpen(true); }}
                onToggle={handleToggleActive}
              />
            </div>
          )}

          {tab === "offices" && canManageOffices && (
            <OfficesTable
              offices={offices}
              loading={officesLoading}
              onEdit={(o) => { setEditingOffice(o); setOfficeFormOpen(true); }}
              onDelete={handleDeleteOffice}
            />
          )}

          {tab === "activity" && (
            <ActivityLogTable activity={activity} loading={activityLoading} />
          )}

          {tab === "settings" && canManageSettings && !settingsLoading && (
            <CompanySettingsForm settings={settings} saving={settingsSaving} isSuperAdmin={isSuperAdmin} onSave={saveSettings} />
          )}

          {tab === "permissions" && isSuperAdmin && !permissionsLoading && permissionMap && (
            <RolePermissionsEditor map={permissionMap} saving={permissionsSaving} onSave={savePermissions} />
          )}

          {tab === "export" && <DataExportPanel />}

          {tab === "announcements" && <AnnouncementComposer />}

          {tab === "holidays" && <HolidayCalendar />}

          {tab === "assets" && <AssetsPanel />}

          {tab === "health" && <SystemHealthPanel />}

          {tab === "trash" && isSuperAdmin && <TrashPanel />}

          {tab === "explorer" && isSuperAdmin && <CollectionExplorer />}

        </main>
      </div>

      <UserForm
        open={userFormOpen}
        user={editingUser}
        onClose={() => { setUserFormOpen(false); setEditingUser(null); }}
        onSubmitNew={addUser}
        onSubmitEdit={editUser}
      />

      <OfficeForm
        open={officeFormOpen}
        office={editingOffice}
        onClose={() => { setOfficeFormOpen(false); setEditingOffice(null); }}
        onSubmit={async (data) => {
          if (editingOffice) await editOffice(editingOffice.id, data);
          else await addOffice({ ...data, address: data.address || null, city: data.city || null, phone: data.phone || null, createdBy: user?.uid ?? "" });
          setOfficeFormOpen(false);
          setEditingOffice(null);
        }}
      />

    </div>
  );
}
