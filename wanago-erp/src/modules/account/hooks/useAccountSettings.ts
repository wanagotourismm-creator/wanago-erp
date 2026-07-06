"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { sendResetEmail, fetchUserProfile } from "@/modules/auth/services/auth.service";
import { updateUserProfile } from "@/modules/admin/users/services/user-admin.service";

export type ProfileUpdateInput = {
  displayName: string;
  phone:       string | null;
};

// Wraps the current signed-in user for the "My Account" page. The auth
// store's `AuthUser` doesn't carry `phone` (it's not needed anywhere else
// in the app), so we fetch the Firestore profile once to read it — the
// store itself stays the single source of truth for everything else and
// is updated in place after a successful save so the rest of the app
// (header, avatar menu, etc.) reflects the change immediately.
export function useAccountSettings() {
  const { user, setUser } = useAuthStore();
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchUserProfile(user.uid).then((profile) => {
      if (cancelled) return;
      setPhone(profile?.phone ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  async function updateProfile(
    data: ProfileUpdateInput
  ): Promise<{ error: string | null }> {
    if (!user) return { error: "You must be signed in." };
    try {
      // Never forward systemRole/teamRole/officeId/isActive from this
      // page — those remain admin-only, edited via Admin > Users.
      await updateUserProfile(user.uid, {
        displayName: data.displayName,
        phone:       data.phone,
      });
      setUser({ ...user, displayName: data.displayName });
      setPhone(data.phone);
      return { error: null };
    } catch {
      return { error: "Failed to update profile. Please try again." };
    }
  }

  async function sendPasswordReset(): Promise<{ error: string | null }> {
    if (!user) return { error: "You must be signed in." };
    return await sendResetEmail(user.email);
  }

  return {
    user,
    phone,
    loading,
    updateProfile,
    sendPasswordReset,
  };
}
