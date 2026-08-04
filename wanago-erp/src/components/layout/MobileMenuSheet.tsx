"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, Clock, LayoutDashboard, LogOut, Mail, Search, X } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { useTeamSpaceUIStore } from "@/store/teamspace-ui.store";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useVisibleNavGroups } from "@/components/layout/useVisibleNavGroups";
import { useRecentNav } from "@/components/layout/useRecentNav";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import type { NavItem } from "@/components/layout/nav-config";
import { cn, initials } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";
import { useCompanySettings } from "@/modules/admin/settings/hooks/useCompanySettings";

function MenuLink({ item, onNavigate }: { item: NavItem; onNavigate: (item: NavItem) => void }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon     = NAV_ICONS[item.icon] ?? LayoutDashboard;
  return (
    <Link href={item.href} onClick={() => onNavigate(item)}
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
  const { openPanel } = useTeamSpaceUIStore();
  const { logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { settings: company } = useCompanySettings();
  const ab = initials(user?.displayName ?? "Admin User") || "AU";
  const visibleGroups = useVisibleNavGroups();
  const { recents, recordVisit } = useRecentNav();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const activeGroup = useMemo(() => {
    return visibleGroups.find((group) =>
      group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    )?.group;
  }, [visibleGroups, pathname]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroup ? [activeGroup] : [])
  );

  function toggleGroup(group: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function handleNavigate(item: NavItem) {
    recordVisit({ href: item.href, label: item.label, icon: item.icon });
    closeMobileSidebar();
  }

  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return null;
    return visibleGroups
      .flatMap((group) => group.items)
      .filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  }, [visibleGroups, normalizedQuery]);

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { openPanel(); closeMobileSidebar(); }}
            aria-label="Open Team Space"
            title="Team Space"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground active:bg-muted transition-colors"
          >
            <Mail size={17} />
          </button>
          <button onClick={closeMobileSidebar} aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground active:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-4 pt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 px-3.5 py-2.5">
          <Search size={16} className="flex-shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu..."
            aria-label="Search menu"
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="flex-shrink-0 text-muted-foreground">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-thin">
        {searchResults ? (
          searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((item) => (
                <MenuLink key={item.href} item={item} onNavigate={handleNavigate} />
              ))}
            </div>
          ) : (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">No pages match &ldquo;{query}&rdquo;</p>
          )
        ) : (
          <>
            {recents.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  <Clock size={12} /> Recent
                </p>
                <div className="space-y-2">
                  {recents.map((entry) => (
                    <MenuLink key={entry.href} item={entry} onNavigate={handleNavigate} />
                  ))}
                </div>
              </div>
            )}
            {visibleGroups.map((group) => {
              const isOpen = openGroups.has(group.group);
              return (
                <div key={group.group} className="mb-3">
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="mb-2 flex w-full items-center justify-between px-1 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50"
                    aria-expanded={isOpen}
                  >
                    {group.group}
                    <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <MenuLink key={item.href} item={item} onNavigate={handleNavigate} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
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
