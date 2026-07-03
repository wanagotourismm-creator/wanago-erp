"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  fetchUserProfile,
  onAuthStateChange,
} from "@/modules/auth/services/auth.service";
import type { AuthUser } from "@/store/auth.store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setInit, reset } = useAuthStore();

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

  return <>{children}</>;
}
