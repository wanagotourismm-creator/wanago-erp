"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import {
  signInUser,
  signOutUser,
  sendResetEmail,
  fetchUserProfile,
  onAuthStateChange,
} from "@/modules/auth/services/auth.service";
import type { AuthUser } from "@/store/auth.store";

export function useAuth() {
  const { user, initialized, setUser, setInit, reset } = useAuthStore();
  const router = useRouter();

  // ── Bootstrap: listen to Firebase auth state ───────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (profile && profile.isActive) {
          const authUser: AuthUser = {
            uid:         firebaseUser.uid,
            email:       profile.email,
            displayName: profile.displayName,
            photoURL:    profile.photoURL,
            systemRole:  profile.systemRole,
            teamRole:    profile.teamRole,
            officeId:    profile.officeId,
            officeName:  profile.officeName,
            department:  profile.department,
            isActive:    profile.isActive,
          };
          setUser(authUser);
        } else {
          reset();
        }
      } else {
        reset();
      }
      setInit(true);
    });

    return () => unsubscribe();
  }, [setUser, setInit, reset]);

  // ── Login ──────────────────────────────────────────────────
  async function login(email: string, password: string) {
    const { user: authUser, error } = await signInUser(email, password);
    if (authUser) {
      setUser(authUser);
      router.push("/dashboard");
    }
    return { error };
  }

  // ── Logout ─────────────────────────────────────────────────
  async function logout() {
    await signOutUser();
    reset();
    router.push("/auth/login");
  }

  // ── Forgot password ────────────────────────────────────────
  async function forgotPassword(email: string) {
    return await sendResetEmail(email);
  }

  return {
    user,
    initialized,
    isAuthenticated: !!user,
    login,
    logout,
    forgotPassword,
  };
}
