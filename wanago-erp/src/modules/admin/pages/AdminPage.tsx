"use client";

import { useState } from "react";
import {
  Plus, RefreshCw, Users as UsersIcon, Building2, History, Settings2, ShieldCheck,
  Download, Megaphone, CalendarDays, Activity, Trash2, Database, LayoutGrid, Laptop, Ticket, Target, KeyRound, BookOpen,
  MessageCircle, Lock,
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
import { UserDetailModal } from "@/modules/admin/users/components/UserDetailModal";
import { BulkUserActions } from "@/modules/admin/users/components/BulkUserActions";
import { OfficesTable } from "@/modules/admin/offices/components/OfficesTable";
import { OfficeForm } from "@/modules/admin/offices/components/OfficeForm";
import { OfficeDetailModal } from "@/modules/admin/offices/components/OfficeDetailModal";
import { ActivityLogTable } from "@/modules/admin/activity/components/ActivityLogTable";
import { CompanySettingsForm } from "@/modules/admin/settings/components/CompanySettingsForm";
import { RolePermissionsEditor } from "@/modules/admin/permissions/components/RolePermissionsEditor";
import { SecuritySettingsForm } from "@/modules/security/components/SecuritySettingsForm";
import { useSecuritySettings } from "@/modules/security/hooks/useSecuritySettings";
import { DataExportPanel } from "@/modules/admin/export/components/DataExportPanel";
import { AnnouncementComposer } from "@/modules/admin/announcements/components/AnnouncementComposer";
import { HolidayCalendar } from "@/modules/admin/holidays/components/HolidayCalendar";
import { WhatsAppTemplatesPanel } from "@/modules/admin/whatsapp-templates/components/WhatsAppTemplatesPanel";
import { AssetsPanel } from "@/modules/assets/components/AssetsPanel";
import { HelpCenterPanel } from "@/modules/helpcenter/components/HelpCenterPanel";
import { TicketsPanel } from "@/modules/tickets/components/TicketsPanel";
import { GoalsPanel } from "@/modules/goals/components/GoalsPanel";
import { IntegrationsPanel } from "@/modules/admin/integrations/components/IntegrationsPanel";
import { SystemHealthPanel } from "@/modules/admin/health/components/SystemHealthPanel";
import { UsagePanel } from "@/modules/admin/usage/components/UsagePanel";
import { TrashPanel } from "@/modules/admin/trash/components/TrashPanel";
import { CollectionExplorer } from "@/modules/admin/explorer/components/CollectionExplorer";
import { backfillEmployeeUserLinks } from "@/modules/hrms/employees/services/employee.service";
import { AdminOverview, type AdminTabKey } from "@/modules/admin/overview/components/AdminOverview";
import { HrShell, type HrNavGroup } from "@/modules/ess/components/HrShell";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { UserProfile } from "@/modules/auth/types";
import type { Office } from "@/modules/admin/offices/types";

type Tab = "overview" | AdminTabKey;

export function AdminPage() {
  const { user } = useAuthStore();
  const canManageUsers    = !!user && hasPermission(user.systemRole, "admin:users");
  const canManageOffices  = !!user && hasPermission(user.systemRole, "admin:offices");
  const canManageSettings = !!user && hasPermission(user.systemRole, "admin:settings");
  const isSuperAdmin = user?.systemRole === "super_admin";

  const [tab, setTab] = useState<Tab>("overview");

  const {
    users, loading: usersLoading, addUser, editUser, toggleActive, removeUser, bulkUpdate, load: loadUsers,
  } = useAdminUsers();
  const {
    offices, loading: officesLoading, addOffice, editOffice, removeOffice, load: loadOffices,
  } = useOffices();
  const { activity, loading: activityLoading, load: loadActivity } = useActivityLog();
  const { settings, loading: settingsLoading, saving: settingsSaving, save: saveSettings } = useCompanySettings();
  const { map: permissionMap, loading: permissionsLoading, saving: permissionsSaving, save: savePermissions } = useRolePermissions();
  const { settings: securitySettings, loading: securityLoading, saving: securitySaving, save: saveSecurity } = useSecuritySettings();
  const { entries: trashEntries } = useTrash();
  const { collections: healthCollections } = useSystemHealth();

  const [userFormOpen,   setUserFormOpen]   = useState(false);
  const [editingUser,    setEditingUser]    = useState<UserProfile | null>(null);
  const [viewingUser,    setViewingUser]    = useState<UserProfile | null>(null);
  const [officeFormOpen, setOfficeFormOpen] = useState(false);
  const [editingOffice,  setEditingOffice]  = useState<Office | null>(null);
  const [viewingOffice,  setViewingOffice]  = useState<Office | null>(null);
  const [selectedUsers,  setSelectedUsers]  = useState<string[]>([]);
  const [syncingLinks,   setSyncingLinks]   = useState(false);

  // One-time migration: employees whose login account was linked before
  // employeeId denormalization existed won't be scoped correctly by the new
  // leads/customers/bookings visibility rules until this runs once (going
  // forward, saving an employee keeps it in sync automatically).
  async function handleSyncEmployeeLinks() {
    setSyncingLinks(true);
    try {
      const { synced, total } = await backfillEmployeeUserLinks();
      alert(`Synced ${synced} of ${total} employee login links.`);
    } catch {
      alert("Failed to sync employee login links.");
    } finally {
      setSyncingLinks(false);
    }
  }

  function handleEditUser(u: UserProfile) {
    setViewingUser(null);
    setEditingUser(u);
    setUserFormOpen(true);
  }

  async function handleToggleActive(u: UserProfile) {
    const action = u.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} "${u.displayName}"?`)) return;
    setViewingUser(null);
    const { error } = await toggleActive(u.uid, !u.isActive);
    if (error) alert(error);
  }

  async function handleDeleteUser(u: UserProfile) {
    if (!confirm(`Permanently delete "${u.displayName}"'s login account? This removes their access entirely and cannot be undone — use Deactivate instead if you might need to restore access later.`)) return;
    setViewingUser(null);
    const { error } = await removeUser(u.uid);
    if (error) alert(error);
  }

  function handleEditOffice(office: Office) {
    setViewingOffice(null);
    setEditingOffice(office);
    setOfficeFormOpen(true);
  }

  async function handleDeleteOffice(office: Office) {
    if (!confirm(`Delete office "${office.name}"? This cannot be undone.`)) return;
    setViewingOffice(null);
    await removeOffice(office.id);
  }

  const navGroups: HrNavGroup[] = [
    { label: "", items: [{ key: "overview", label: "Overview", icon: LayoutGrid }] },
    {
      label: "People",
      items: [
        canManageUsers   && { key: "users",   label: "Users",   icon: UsersIcon },
        canManageOffices && { key: "offices", label: "Offices", icon: Building2 },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    {
      label: "Communication",
      items: [
        { key: "announcements", label: "Announcements", icon: Megaphone },
        { key: "holidays",      label: "Holidays",       icon: CalendarDays },
        { key: "helpcenter",    label: "Help Center",    icon: BookOpen },
        isSuperAdmin && { key: "whatsapp-templates", label: "WhatsApp Templates", icon: MessageCircle },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    {
      label: "HR Operations",
      items: [
        { key: "assets",  label: "Assets",     icon: Laptop },
        { key: "tickets", label: "IT Support", icon: Ticket },
      ],
    },
    { label: "Strategy", items: [{ key: "goals", label: "Company Goals", icon: Target }] },
    {
      label: "Configuration",
      items: [
        canManageSettings && { key: "settings",     label: "Company Settings",    icon: Settings2 },
        isSuperAdmin       && { key: "permissions",  label: "Roles & Permissions", icon: ShieldCheck },
        isSuperAdmin       && { key: "security",     label: "Security",           icon: Lock },
        isSuperAdmin       && { key: "integrations", label: "Integrations",       icon: KeyRound },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    {
      label: "Data & Monitoring",
      items: [
        { key: "export",   label: "Data Export",   icon: Download },
        { key: "health",   label: "System Health", icon: Activity },
        { key: "activity", label: "Activity Log",  icon: History },
      ],
    },
    {
      label: "Danger Zone",
      items: [
        isSuperAdmin && { key: "trash",    label: "Trash",               icon: Trash2 },
        isSuperAdmin && { key: "explorer", label: "Collection Explorer", icon: Database },
      ].filter(Boolean) as HrNavGroup["items"],
    },
  ].filter((g) => g.items.length > 0);

  const headerRight = (
    <>
      {tab === "users" && (
        <>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadUsers()}>Refresh</Button>
          {isSuperAdmin && (
            <Button
              variant="outline" size="sm"
              icon={syncingLinks ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              disabled={syncingLinks}
              onClick={handleSyncEmployeeLinks}
            >
              Sync Employee Links
            </Button>
          )}
        </>
      )}
      {tab === "offices" && (
        <>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadOffices()}>Refresh</Button>
          {canManageOffices && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingOffice(null); setOfficeFormOpen(true); }}>Add Office</Button>
          )}
        </>
      )}
      {tab === "activity" && (
        <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadActivity()}>Refresh</Button>
      )}
    </>
  );

  return (
    <div className={cn("space-y-0")}>
      <HrShell
        navGroups={navGroups}
        activeKey={tab}
        onNavigate={(k) => setTab(k as Tab)}
        headerIcon={ShieldCheck}
        headerTitle="Admin"
        headerSubtitle={user ? `Signed in as ${user.displayName ?? user.email}` : ""}
        headerRight={headerRight}
      >
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
              onView={setViewingUser}
              onEdit={handleEditUser}
              onToggle={handleToggleActive}
              onDelete={isSuperAdmin ? handleDeleteUser : undefined}
            />
          </div>
        )}

        {tab === "offices" && canManageOffices && (
          <OfficesTable
            offices={offices}
            loading={officesLoading}
            onView={setViewingOffice}
            onEdit={handleEditOffice}
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

        {tab === "security" && isSuperAdmin && !securityLoading && (
          <SecuritySettingsForm settings={securitySettings} saving={securitySaving} onSave={saveSecurity} />
        )}

        {tab === "integrations" && isSuperAdmin && <IntegrationsPanel />}

        {tab === "export" && <DataExportPanel />}

        {tab === "announcements" && <AnnouncementComposer />}

        {tab === "holidays" && <HolidayCalendar />}

        {tab === "helpcenter" && <HelpCenterPanel />}

        {tab === "whatsapp-templates" && isSuperAdmin && <WhatsAppTemplatesPanel />}

        {tab === "assets" && <AssetsPanel />}

        {tab === "tickets" && <TicketsPanel />}

        {tab === "goals" && <GoalsPanel />}

        {tab === "health" && (
          <div className="space-y-8">
            <SystemHealthPanel />
            <UsagePanel />
          </div>
        )}

        {tab === "trash" && isSuperAdmin && <TrashPanel />}

        {tab === "explorer" && isSuperAdmin && <CollectionExplorer />}

      </HrShell>

      <UserDetailModal
        user={viewingUser ? users.find(u => u.uid === viewingUser.uid) ?? viewingUser : null}
        onClose={() => setViewingUser(null)}
        onEdit={handleEditUser}
        onToggle={handleToggleActive}
        onDelete={isSuperAdmin ? handleDeleteUser : undefined}
      />

      <OfficeDetailModal
        office={viewingOffice ? offices.find(o => o.id === viewingOffice.id) ?? viewingOffice : null}
        onClose={() => setViewingOffice(null)}
        onEdit={handleEditOffice}
        onDelete={handleDeleteOffice}
      />

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
          else await addOffice({
            ...data,
            address: data.address || null, city: data.city || null, phone: data.phone || null,
            latitude: data.latitude ?? null, longitude: data.longitude ?? null, geofenceRadiusMeters: data.geofenceRadiusMeters ?? null,
            createdBy: user?.uid ?? "",
          });
          setOfficeFormOpen(false);
          setEditingOffice(null);
        }}
      />

    </div>
  );
}
