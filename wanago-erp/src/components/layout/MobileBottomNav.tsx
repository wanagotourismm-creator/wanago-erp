"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, LayoutDashboard } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useVisibleNavGroups } from "@/components/layout/useVisibleNavGroups";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils/helpers";

// Fixed bottom tab bar for phones/tablets (below lg) — a touch-first
// navigation pattern instead of the desktop sidebar. Shows Dashboard plus
// the first few role-visible sections, with a "Menu" tab opening the full
// list (MobileMenuSheet) for everything else.
export function MobileBottomNav() {
  const pathname = usePathname();
  const { toggleMobileSidebar, mobileSidebarOpen } = useUIStore();
  const visibleGroups = useVisibleNavGroups();

  const flatItems = visibleGroups.flatMap((group) => group.items);
  const shortcuts = flatItems.slice(0, 4);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {shortcuts.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
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
