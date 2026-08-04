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

// mobileQuickAccess can be a flat number (same priority for every role) or a
// per-role map (different priority, or no priority at all, per role) — see
// nav-config.ts. Resolves to undefined when the item isn't curated for role.
function resolveQuickAccessPriority(item: NavItem, role: SystemRole | undefined): number | undefined {
  const config = item.mobileQuickAccess;
  if (config == null) return undefined;
  if (typeof config === "number") return config;
  return role ? config[role] : undefined;
}

// The phone bottom-nav's 4 shortcut slots — curated by mobileQuickAccess
// priority (see nav-config.ts) instead of "first 4 in list order", so a
// sales/field user actually sees Leads/Bookings rather than whatever the
// department grouping happened to list first. Pads with the next
// highest-priority visible items (in group order) if a role has fewer than
// 4 curated items visible, so the bar never looks sparse.
export function useMobileQuickAccessItems(): NavItem[] {
  const { user } = useAuthStore();
  const role = user?.systemRole as SystemRole | undefined;
  const visibleGroups = useVisibleNavGroups();
  const flatItems = visibleGroups.flatMap((group) => group.items);

  const curated = flatItems
    .map((item) => ({ item, priority: resolveQuickAccessPriority(item, role) }))
    .filter((entry): entry is { item: NavItem; priority: number } => entry.priority != null)
    .sort((a, b) => a.priority - b.priority)
    .map((entry) => entry.item);

  if (curated.length >= 4) return curated.slice(0, 4);

  const curatedHrefs = new Set(curated.map((item) => item.href));
  const fallback = flatItems.filter((item) => !curatedHrefs.has(item.href));
  return [...curated, ...fallback].slice(0, 4);
}
