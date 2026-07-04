"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchUsers, createUserAccount, updateUserProfile, type NewUserInput,
} from "@/modules/admin/users/services/user-admin.service";
import { useAuthStore } from "@/store/auth.store";
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
      return { error: null };
    } catch {
      return { error: "Failed to update user" };
    }
  }

  async function toggleActive(uid: string, isActive: boolean): Promise<void> {
    await updateUserProfile(uid, { isActive });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isActive } : u));
  }

  return { users, loading, error, load, addUser, editUser, toggleActive };
}
