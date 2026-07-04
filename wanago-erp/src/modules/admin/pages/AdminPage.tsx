"use client";

import { useState } from "react";
import {
  Plus, RefreshCw, Users as UsersIcon, Building2, History, Settings2, ShieldCheck,
  Download, Megaphone, CalendarDays, Activity, Trash2, Database,
} from "lucide-react";
import { useAdminUsers } from "@/modules/admin/users/hooks/useAdminUsers";
import { useOffices } from "@/modules/admin/offices/hooks/useOffices";
import { useActivityLog } from "@/modules/admin/activity/hooks/useActivityLog";
import { useCompanySettings } from "@/modules/admin/settings/hooks/useCompanySettings";
import { useRolePermissions } from "@/modules/admin/permissions/hooks/useRolePermissions";
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
import { SystemHealthPanel } from "@/modules/admin/health/components/SystemHealthPanel";
import { TrashPanel } from "@/modules/admin/trash/components/TrashPanel";
import { CollectionExplorer } from "@/modules/admin/explorer/components/CollectionExplorer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { UserProfile } from "@/modules/auth/types";
import type { Office } from "@/modules/admin/offices/types";

type Tab = "users" | "offices" | "activity" | "settings" | "permissions" | "export" | "announcements" | "holidays" | "health" | "trash" | "explorer";

export function AdminPage() {
  const { user } = useAuthStore();
  const canManageUsers   = !!user && hasPermission(user.systemRole, "admin:users");
  const canManageOffices = !!user && hasPermission(user.systemRole, "admin:offices");
  const canManageSettings = !!user && hasPermission(user.systemRole, "admin:settings");
  const isSuperAdmin = user?.systemRole === "super_admin";

  const [tab, setTab] = useState<Tab>(canManageUsers ? "users" : canManageOffices ? "offices" : "activity");

  const {
    users, loading: usersLoading, addUser, editUser, toggleActive, bulkUpdate, load: loadUsers,
  } = useAdminUsers();
  const {
    offices, loading: officesLoading, addOffice, editOffice, removeOffice, load: loadOffices,
  } = useOffices();
  const { activity, loading: activityLoading, load: loadActivity } = useActivityLog();
  const { settings, loading: settingsLoading, saving: settingsSaving, save: saveSettings } = useCompanySettings();
  const { map: permissionMap, loading: permissionsLoading, saving: permissionsSaving, save: savePermissions } = useRolePermissions();

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

  return (
    <div className="space-y-5">

      <PageHeader
        title="Admin"
        description="Manage users, offices, permissions, and system settings"
        actions={
          <>
            {tab === "users" && (
              <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadUsers()}>
                Refresh
              </Button>
            )}
            {tab === "offices" && (
              <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadOffices()}>
                Refresh
              </Button>
            )}
            {tab === "activity" && (
              <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadActivity()}>
                Refresh
              </Button>
            )}
            {tab === "users" && canManageUsers && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingUser(null); setUserFormOpen(true); }}>
                Add User
              </Button>
            )}
            {tab === "offices" && canManageOffices && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingOffice(null); setOfficeFormOpen(true); }}>
                Add Office
              </Button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border">
        {canManageUsers && (
          <button onClick={() => setTab("users")} className={cn(
            "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
            tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}>
            <UsersIcon size={14} /> Users
          </button>
        )}
        {canManageOffices && (
          <button onClick={() => setTab("offices")} className={cn(
            "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
            tab === "offices" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}>
            <Building2 size={14} /> Offices
          </button>
        )}
        <button onClick={() => setTab("activity")} className={cn(
          "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <History size={14} /> Activity Log
        </button>
        {canManageSettings && (
          <button onClick={() => setTab("settings")} className={cn(
            "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
            tab === "settings" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}>
            <Settings2 size={14} /> Company Settings
          </button>
        )}
        {isSuperAdmin && (
          <button onClick={() => setTab("permissions")} className={cn(
            "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
            tab === "permissions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}>
            <ShieldCheck size={14} /> Roles & Permissions
          </button>
        )}
        <button onClick={() => setTab("export")} className={cn(
          "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "export" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Download size={14} /> Data Export
        </button>
        <button onClick={() => setTab("announcements")} className={cn(
          "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "announcements" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Megaphone size={14} /> Announcements
        </button>
        <button onClick={() => setTab("holidays")} className={cn(
          "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "holidays" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <CalendarDays size={14} /> Holidays
        </button>
        <button onClick={() => setTab("health")} className={cn(
          "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
          tab === "health" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Activity size={14} /> System Health
        </button>
        {isSuperAdmin && (
          <button onClick={() => setTab("trash")} className={cn(
            "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
            tab === "trash" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}>
            <Trash2 size={14} /> Trash
          </button>
        )}
        {isSuperAdmin && (
          <button onClick={() => setTab("explorer")} className={cn(
            "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
            tab === "explorer" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}>
            <Database size={14} /> Collection Explorer
          </button>
        )}
      </div>

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

      {tab === "health" && <SystemHealthPanel />}

      {tab === "trash" && isSuperAdmin && <TrashPanel />}

      {tab === "explorer" && isSuperAdmin && <CollectionExplorer />}

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
