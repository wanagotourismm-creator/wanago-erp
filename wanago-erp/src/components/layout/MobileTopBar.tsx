"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { useGlobalSearchUIStore } from "@/store/global-search-ui.store";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { cn, initials } from "@/lib/utils/helpers";

function useBreadcrumbTitle() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  return last ? last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Dashboard";
}

// Mobile-only header (lg:hidden), mounted alongside — not replacing —
// TopNav (desktop-only, see TopNav.tsx). Lighter than the desktop bar: the
// avatar doubles as the menu trigger (Google Pay pattern — identity opens
// navigation, no separate hamburger) and secondary actions are trimmed to
// just search + notifications; Team Space lives in MobileMenuSheet instead.
export function MobileTopBar() {
  const { toggleMobileSidebar } = useUIStore();
  const { user } = useAuthStore();
  const openPalette = useGlobalSearchUIStore((s) => s.openPalette);
  const title = useBreadcrumbTitle();
  const ab = initials(user?.displayName ?? "User") || "U";

  return (
    <header className="flex h-14 w-full flex-shrink-0 items-center gap-3 border-b border-border bg-background px-3 lg:hidden">
      <button
        onClick={toggleMobileSidebar}
        aria-label="Open menu"
        className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white shadow-sm"
        )}
      >
        {ab}
      </button>

      <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
        {title}
      </h1>

      <button
        onClick={openPalette}
        aria-label="Search"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-muted transition-colors"
      >
        <Search size={17} />
      </button>

      <NotificationBell />
    </header>
  );
}
