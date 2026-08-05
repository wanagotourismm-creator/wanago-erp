"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, LayoutDashboard } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useMobileQuickAccessItems } from "@/components/layout/useVisibleNavGroups";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils/helpers";

// Fixed bottom tab bar for phones/tablets (below lg) — a touch-first
// navigation pattern instead of the desktop sidebar. Shows the curated
// mobileQuickAccess shortcuts (see nav-config.ts), with a "Menu" tab
// opening the full list (MobileMenuSheet) for everything else.
export function MobileBottomNav() {
  const pathname = usePathname();
  const { toggleMobileSidebar, mobileSidebarOpen } = useUIStore();
  const shortcuts = useMobileQuickAccessItems();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-card shadow-nav-bottom lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {shortcuts.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors active:scale-95"
          >
            <span className="relative flex flex-col items-center gap-0.5">
              {isActive && (
                <span className="absolute -top-2.5 h-[3px] w-5 rounded-full bg-primary" />
              )}
              <span className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}>
                <Icon size={19} />
              </span>
            </span>
            <span className={cn("truncate max-w-[64px]", isActive ? "text-primary font-semibold" : "text-muted-foreground")}>
              {item.label}
            </span>
          </Link>
        );
      })}
      <button
        onClick={toggleMobileSidebar}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors active:scale-95"
      >
        <span className="relative flex flex-col items-center gap-0.5">
          {mobileSidebarOpen && (
            <span className="absolute -top-2.5 h-[3px] w-5 rounded-full bg-primary" />
          )}
          <span className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            mobileSidebarOpen ? "bg-primary/10 text-primary" : "text-muted-foreground"
          )}>
            <MenuIcon size={19} />
          </span>
        </span>
        <span className={cn(mobileSidebarOpen ? "text-primary font-semibold" : "text-muted-foreground")}>Menu</span>
      </button>
    </nav>
  );
}
