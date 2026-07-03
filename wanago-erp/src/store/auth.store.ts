import { create } from "zustand";
import type { SystemRole, TeamRole } from "@/types/rbac";

export type AuthUser = {
  uid:        string;
  email:      string;
  displayName: string | null;
  photoURL:   string | null;
  // Wanago-specific fields (stored in Firestore users collection)
  systemRole: SystemRole;
  teamRole:   TeamRole;
  officeId:   string;
  officeName: string;
  department: string;
  isActive:   boolean;
};

type AuthState = {
  user:        AuthUser | null;
  initialized: boolean;
  setUser:     (user: AuthUser | null) => void;
  setInit:     (v: boolean) => void;
  reset:       () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user:        null,
  initialized: false,

  setUser: (user) => set({ user }),
  setInit: (initialized) => set({ initialized }),
  reset:   () => set({ user: null, initialized: true }),
}));
