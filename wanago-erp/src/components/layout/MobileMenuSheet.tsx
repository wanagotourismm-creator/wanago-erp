"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LayoutDashboard, LogOut, X } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useVisibleNavGroups } from "@/components/layout/useVisibleNavGroups";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import type { NavItem } from "@/components/layout/nav-config";
import { cn, initials } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";
import { useCompanySettings } from "@/modules/admin/settings/hooks/useCompanySettings";

function MenuLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon     = NAV_ICONS[item.icon] ?? LayoutDashboard;
  return (
    <Link href={item.href} onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-medium transition-all active:scale-[0.98]",
        isActive
          ? "bg-primary text-white shadow-sm"
          : "bg-muted/50 text-foreground"
      )}
    >
      <Icon size={19} className="flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// Full-screen nav overlay used on phones/tablets (below lg) in place of the
// desktop off-canvas sidebar drawer — dedicated touch-first layout rather
// than a shrunk-down version of the desktop sidebar.
export function MobileMenuSheet() {
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { settings: company } = useCompanySettings();
  const ab = initials(user?.displayName ?? "Admin User") || "AU";
  const visibleGroups = useVisibleNavGroups();

  if (!mobileSidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
      {/* Header */}
      <div className="flex h-[64px] flex-shrink-0 items-center justify-between border-b border-border px-4">
        <div className="relative h-9 w-[150px]">
          <Image
            src={isDark ? "/images/logo-white-clean.png" : "/images/logo-dark-clean.png"}
            alt={company.businessName}
            fill
            className="object-contain object-left"
            priority
            sizes="150px"
          />
        </div>
        <button onClick={closeMobileSidebar} aria-label="Close menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground active:bg-muted transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-thin">
        {visibleGroups.map((group) => (
          <div key={group.group} className="mb-5">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {group.group}
            </p>
            <div className="space-y-2">
              {group.items.map((item) => (
                <MenuLink key={item.href} item={item} onNavigate={closeMobileSidebar} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User */}
      <div className="flex-shrink-0 border-t border-border p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white shadow-sm">
            {ab}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{user?.displayName ?? "User"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.systemRole ? SYSTEM_ROLE_LABELS[user.systemRole] : ""}
            </p>
          </div>
          <button onClick={logout} title="Sign out"
            className="flex-shrink-0 rounded-xl p-2.5 text-muted-foreground active:bg-background transition-colors">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
