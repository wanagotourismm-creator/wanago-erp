"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchUsers, createUserAccount, updateUserProfile, bulkUpdateUsers, deleteUserAccount, type NewUserInput,
} from "@/modules/admin/users/services/user-admin.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { UserProfile } from "@/modules/auth/types";

export function useAdminUsers() {
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addUser(data: NewUserInput): Promise<{ error: string | null }> {
    try {
      await createUserAccount(data, user?.uid ?? "");
      await load();
      logActivity({
        entityType: "User", entityName: data.displayName, action: "created",
        detail: `Created user account for ${data.email}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create user";
      return { error: message.replace("Firebase: ", "").replace(/\s*\(auth\/.*\)\.?/, "") };
    }
  }

  async function editUser(
    uid: string, data: Parameters<typeof updateUserProfile>[1]
  ): Promise<{ error: string | null }> {
    try {
      await updateUserProfile(uid, data);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...data } : u));
      const target = users.find(u => u.uid === uid);
      if (target) {
        logActivity({
          entityType: "User", entityName: target.displayName, action: "updated",
          detail: `Updated user ${target.email}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to update user" };
    }
  }

  async function toggleActive(uid: string, isActive: boolean): Promise<void> {
    await updateUserProfile(uid, { isActive });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isActive } : u));
    const target = users.find(u => u.uid === uid);
    if (target) {
      logActivity({
        entityType: "User", entityName: target.displayName, action: "status_changed",
        detail: `${isActive ? "Activated" : "Deactivated"} ${target.email}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }
  }

  async function removeUser(uid: string): Promise<{ error: string | null }> {
    const target = users.find((u) => u.uid === uid);
    const { error } = await deleteUserAccount(uid);
    if (error) return { error };
    setUsers((prev) => prev.filter((u) => u.uid !== uid));
    if (target) {
      logActivity({
        entityType: "User", entityName: target.displayName, action: "deleted",
        detail: `Deleted user account ${target.email}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }
    return { error: null };
  }

  async function bulkUpdate(
    uids: string[],
    data: Parameters<typeof bulkUpdateUsers>[1]
  ): Promise<void> {
    await bulkUpdateUsers(uids, data);
    setUsers(prev => prev.map(u => uids.includes(u.uid) ? { ...u, ...data } : u));
    logActivity({
      entityType: "User", entityName: `${uids.length} users`, action: "updated",
      detail: `Bulk updated ${uids.length} user(s): ${Object.keys(data).join(", ")}`,
      actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
    });
  }

  return { users, loading, error, load, addUser, editUser, toggleActive, removeUser, bulkUpdate };
}
