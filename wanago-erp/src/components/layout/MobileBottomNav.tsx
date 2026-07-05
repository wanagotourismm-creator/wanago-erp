"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon } from "lucide-react";
import {
  LayoutDashboard, Users, UserCheck, CalendarCheck,
  Package, Store, Map, FileText, CreditCard,
  Receipt, Megaphone, BadgeCheck, CalendarOff, Wallet,
  BarChart3, Settings, Clock,
  ShieldCheck, UserPlus, Target, GraduationCap,
} from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { canAccessPage } from "@/lib/rbac";
import { NAV_CONFIG, type NavItem } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils/helpers";
import type { SystemRole } from "@/types/rbac";

const ICONS: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  "users":            Users,
  "user-check":       UserCheck,
  "calendar-check":   CalendarCheck,
  "package":          Package,
  "building-store":   Store,
  "map":              Map,
  "file-invoice":     FileText,
  "credit-card":      CreditCard,
  "receipt":          Receipt,
  "speakerphone":     Megaphone,
  "id-badge":         BadgeCheck,
  "calendar-off":     CalendarOff,
  "cash":             Wallet,
  "clock":            Clock,
  "chart-bar":        BarChart3,
  "settings":         Settings,
  "shield":           ShieldCheck,
  "user-plus":        UserPlus,
  "target":           Target,
  "graduation-cap":   GraduationCap,
};

// Fixed bottom tab bar for phones/tablets (below lg) — a touch-first
// navigation pattern instead of the desktop sidebar. Shows Dashboard plus
// the first few role-visible sections, with a "Menu" tab opening the full
// list (MobileMenuSheet) for everything else.
export function MobileBottomNav() {
  const pathname = usePathname();
  const { toggleMobileSidebar, mobileSidebarOpen } = useUIStore();
  const { user } = useAuthStore();

  const flatItems: NavItem[] = NAV_CONFIG.flatMap((group) =>
    group.items.filter((item) => {
      if (!item.roles) return true;
      if (!user) return false;
      return item.roles.includes(user.systemRole as SystemRole) ||
        canAccessPage(user.systemRole as SystemRole, item.href.replace("/", ""));
    })
  );

  const shortcuts = flatItems.slice(0, 4);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {shortcuts.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon size={20} className={cn(isActive && "fill-primary/10")} />
            <span className="truncate max-w-[64px]">{item.label}</span>
          </Link>
        );
      })}
      <button
        onClick={toggleMobileSidebar}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
          mobileSidebarOpen ? "text-primary" : "text-muted-foreground"
        )}
      >
        <MenuIcon size={20} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
