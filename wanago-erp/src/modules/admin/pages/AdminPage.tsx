"use client";

import { useState } from "react";
import { Plus, RefreshCw, Users as UsersIcon, Building2 } from "lucide-react";
import { useAdminUsers } from "@/modules/admin/users/hooks/useAdminUsers";
import { useOffices } from "@/modules/admin/offices/hooks/useOffices";
import { UsersTable } from "@/modules/admin/users/components/UsersTable";
import { UserForm } from "@/modules/admin/users/components/UserForm";
import { OfficesTable } from "@/modules/admin/offices/components/OfficesTable";
import { OfficeForm } from "@/modules/admin/offices/components/OfficeForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { UserProfile } from "@/modules/auth/types";
import type { Office } from "@/modules/admin/offices/types";

export function AdminPage() {
  const { user } = useAuthStore();
  const canManageUsers   = !!user && hasPermission(user.systemRole, "admin:users");
  const canManageOffices = !!user && hasPermission(user.systemRole, "admin:offices");

  const [tab, setTab] = useState<"users" | "offices">(canManageUsers ? "users" : "offices");

  const {
    users, loading: usersLoading, addUser, editUser, toggleActive, load: loadUsers,
  } = useAdminUsers();
  const {
    offices, loading: officesLoading, addOffice, editOffice, removeOffice, load: loadOffices,
  } = useOffices();

  const [userFormOpen,   setUserFormOpen]   = useState(false);
  const [editingUser,    setEditingUser]    = useState<UserProfile | null>(null);
  const [officeFormOpen, setOfficeFormOpen] = useState(false);
  const [editingOffice,  setEditingOffice]  = useState<Office | null>(null);

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
        description="Manage system users and office locations"
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
      <div className="flex items-center gap-2 border-b border-border">
        {canManageUsers && (
          <button
            onClick={() => setTab("users")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
              tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <UsersIcon size={14} /> Users
          </button>
        )}
        {canManageOffices && (
          <button
            onClick={() => setTab("offices")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors -mb-px",
              tab === "offices" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 size={14} /> Offices
          </button>
        )}
      </div>

      {tab === "users" && canManageUsers && (
        <UsersTable
          users={users}
          loading={usersLoading}
          onEdit={(u) => { setEditingUser(u); setUserFormOpen(true); }}
          onToggle={handleToggleActive}
        />
      )}

      {tab === "offices" && canManageOffices && (
        <OfficesTable
          offices={offices}
          loading={officesLoading}
          onEdit={(o) => { setEditingOffice(o); setOfficeFormOpen(true); }}
          onDelete={handleDeleteOffice}
        />
      )}

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
