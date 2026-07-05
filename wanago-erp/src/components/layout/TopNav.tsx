"use client";

import { usePathname } from "next/navigation";
import { Menu, Mail } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useTeamSpaceUIStore } from "@/store/teamspace-ui.store";
import { SearchBar } from "@/components/layout/SearchBar";
import { UserMenu } from "@/components/layout/UserMenu";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { NavPills } from "@/components/layout/NavPills";
import { cn } from "@/lib/utils/helpers";

function useBreadcrumb() {
  const pathname = usePathname();
  return pathname.split("/").filter(Boolean).map((s) =>
    s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// Sits alongside the Sidebar (which owns navigation when expanded) — this
// bar is page title + search + Team Space + notifications + account menu.
// When the sidebar is collapsed to its icon rail, this also surfaces the
// full nav (as pill dropdowns) so navigation stays reachable with labels.
export function TopNav() {
  const { toggleMobileSidebar, sidebarCollapsed } = useUIStore();
  const { openPanel } = useTeamSpaceUIStore();
  const breadcrumb = useBreadcrumb();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full flex-shrink-0 items-center gap-2 border-b border-border bg-card px-3 shadow-nav sm:gap-4 sm:px-6">

      {/* Mobile menu trigger — sidebar is off-canvas below the lg breakpoint */}
      <button
        onClick={toggleMobileSidebar}
        aria-label="Open menu"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all lg:hidden"
      >
        <Menu size={17} />
      </button>

      {/* Page title — hidden at lg+ once the sidebar collapses, replaced by NavPills */}
      <h1 className={cn("min-w-0 truncate text-base font-bold text-foreground sm:text-lg", sidebarCollapsed && "lg:hidden")}>
        {breadcrumb[breadcrumb.length - 1] ?? "Dashboard"}
      </h1>

      {sidebarCollapsed && <NavPills />}

      <div className="flex-1" />

      <SearchBar />

      <button
        onClick={openPanel}
        aria-label="Open Team Space"
        title="Team Space"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
      >
        <Mail size={15} />
      </button>

      <NotificationBell />

      <UserMenu />
    </header>
  );
}
