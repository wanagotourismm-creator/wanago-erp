"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Users, UserCheck, CalendarCheck,
  Package, Store, Map, FileText, CreditCard,
  Receipt, Megaphone, BadgeCheck, CalendarOff, Wallet,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Clock,
  ShieldCheck, UserPlus, Target, GraduationCap, UserCircle, Gauge,
} from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { canAccessPage } from "@/lib/rbac";
import { NAV_CONFIG, type NavItem } from "@/components/layout/nav-config";
import { cn, initials } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";
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
  "user-circle":      UserCircle,
  "gauge":            Gauge,
};

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon     = ICONS[item.icon] ?? LayoutDashboard;
  return (
    <Link href={item.href} title={collapsed ? item.label : undefined}
      className={cn(
        "nav-fluid group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary text-white shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="sidebar-active-indicator absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-r-full" />
      )}
      <Icon size={17} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

// Desktop-only (lg and up) — phones/tablets use MobileBottomNav + MobileMenuSheet instead.
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const ab = initials(user?.displayName ?? "Wanago Admin") || "WA";
  const [hovering, setHovering] = useState(false);

  const visibleGroups = NAV_CONFIG.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.roles) return true;
      if (!user) return false;
      return item.roles.includes(user.systemRole as SystemRole) ||
        canAccessPage(user.systemRole as SystemRole, item.href.replace("/", ""));
    }),
  })).filter((g) => g.items.length > 0);

  const renderLogo = (collapsed: boolean) => (
    <div className={cn(
      "flex h-[64px] flex-shrink-0 items-center border-b border-border",
      collapsed ? "justify-center px-3" : "px-5"
    )}>
      {collapsed ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold text-base shadow-sm">
          W
        </div>
      ) : (
        <div className="relative h-11 w-[180px]">
          <Image
            src={isDark ? "/images/logo-white-clean.png" : "/images/logo-dark-clean.png"}
            alt="Wanago Travel & Co"
            fill
            className="object-contain object-left"
            priority
            sizes="180px"
          />
        </div>
      )}
    </div>
  );

  const renderNav = (collapsed: boolean) => (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin">
      {visibleGroups.map((group) => (
        <div key={group.group} className="mb-5">
          {!collapsed && (
            <p className="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {group.group}
            </p>
          )}
          <div className="space-y-0.5 px-2">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const renderUser = (collapsed: boolean) => (
    <div className="flex-shrink-0 border-t border-border p-3">
      {collapsed ? (
        <button onClick={logout} title="Sign out"
          className="flex w-full items-center justify-center rounded-xl py-2 text-muted-foreground hover:bg-muted transition-colors">
          <LogOut size={16} />
        </button>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted transition-colors">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white shadow-sm">
            {ab}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{user?.displayName ?? "User"}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.systemRole ? SYSTEM_ROLE_LABELS[user.systemRole] : ""}
            </p>
          </div>
          <button onClick={logout} title="Sign out"
            className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        "hidden lg:flex relative flex-col h-screen transition-all duration-300 ease-in-out",
        "border-r border-border bg-card",
        "lg:sticky lg:top-0",
        sidebarCollapsed ? "lg:w-[68px]" : "lg:w-[240px]"
      )}>

      {renderLogo(sidebarCollapsed)}
      {renderNav(sidebarCollapsed)}
      {renderUser(sidebarCollapsed)}

      {/* Collapse toggle */}
      <button onClick={toggleSidebar}
        className="absolute -right-3 top-[76px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-sm transition-colors"
        aria-label={sidebarCollapsed ? "Expand" : "Collapse"}>
        {sidebarCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {/* Hover flyout: shows full expanded content over page content without affecting layout width */}
      {sidebarCollapsed && hovering && (
        <div className={cn(
          "absolute left-0 top-0 z-50 flex h-full w-[240px] flex-col",
          "border-r border-border bg-card shadow-2xl",
          "transition-all duration-200 ease-in-out"
        )}>
          {renderLogo(false)}
          {renderNav(false)}
          {renderUser(false)}
        </div>
      )}
    </aside>
  );
}
