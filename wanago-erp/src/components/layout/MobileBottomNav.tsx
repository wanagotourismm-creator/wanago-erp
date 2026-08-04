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
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.625rem)" }}
    >
      <nav className="flex w-full max-w-md items-stretch gap-0.5 rounded-[26px] border border-border bg-card p-1.5 shadow-nav-bottom">
        {shortcuts.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium transition-colors active:scale-95",
                isActive ? "bg-primary/10" : ""
              )}
            >
              <Icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
              <span className={cn("truncate max-w-[60px]", isActive ? "text-primary font-bold" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={toggleMobileSidebar}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium transition-colors active:scale-95",
            mobileSidebarOpen ? "bg-primary/10" : ""
          )}
        >
          <MenuIcon size={18} className={mobileSidebarOpen ? "text-primary" : "text-muted-foreground"} />
          <span className={cn(mobileSidebarOpen ? "text-primary font-bold" : "text-muted-foreground")}>Menu</span>
        </button>
      </nav>
    </div>
  );
}
