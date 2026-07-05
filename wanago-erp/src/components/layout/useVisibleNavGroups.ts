"use client";

import { useAuthStore } from "@/store/auth.store";
import { canAccessPage } from "@/lib/rbac";
import { NAV_CONFIG, type NavGroup } from "@/components/layout/nav-config";
import type { SystemRole } from "@/types/rbac";

// Shared role-filter logic — previously copy-pasted identically across
// Sidebar/MobileBottomNav/MobileMenuSheet.
export function useVisibleNavGroups(): NavGroup[] {
  const { user } = useAuthStore();

  return NAV_CONFIG.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.roles) return true;
      if (!user) return false;
      return item.roles.includes(user.systemRole as SystemRole) ||
        canAccessPage(user.systemRole as SystemRole, item.href.replace("/", ""));
    }),
  })).filter((g) => g.items.length > 0);
}
