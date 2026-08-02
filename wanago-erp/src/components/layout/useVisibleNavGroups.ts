"use client";

import { useAuthStore } from "@/store/auth.store";
import { canAccessPage } from "@/lib/rbac";
import { NAV_CONFIG, type NavGroup, type NavItem } from "@/components/layout/nav-config";
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
        canAccessPage(user, item.href.replace("/", ""));
    }),
  })).filter((g) => g.items.length > 0);
}

// The phone bottom-nav's 4 shortcut slots — curated by mobileQuickAccess
// priority (see nav-config.ts) instead of "first 4 in list order", so a
// sales/field user actually sees Leads/Bookings rather than whatever the
// department grouping happened to list first. Pads with the next
// highest-priority visible items (in group order) if a role has fewer than
// 4 curated items visible, so the bar never looks sparse.
export function useMobileQuickAccessItems(): NavItem[] {
  const visibleGroups = useVisibleNavGroups();
  const flatItems = visibleGroups.flatMap((group) => group.items);

  const curated = flatItems
    .filter((item) => item.mobileQuickAccess != null)
    .sort((a, b) => a.mobileQuickAccess! - b.mobileQuickAccess!);

  if (curated.length >= 4) return curated.slice(0, 4);

  const curatedHrefs = new Set(curated.map((item) => item.href));
  const fallback = flatItems.filter((item) => !curatedHrefs.has(item.href));
  return [...curated, ...fallback].slice(0, 4);
}
