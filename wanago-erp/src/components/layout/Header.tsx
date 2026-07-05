"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, Sun, Moon, Monitor, Palette, X, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { cn, initials } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";

function useBreadcrumb() {
  const pathname = usePathname();
  return pathname.split("/").filter(Boolean).map((s) =>
    s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function ModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center rounded-xl border border-border bg-muted p-1 gap-1">
      {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "Auto"]] as const).map(([v, Icon, label]) => (
        <button
          key={v}
          onClick={() => setTheme(v)}
          title={label}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
            theme === v
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          <Icon size={13} />
          <span className="hidden lg:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { user }            = useAuthStore();
  const { toggleMobileSidebar } = useUIStore();
  const breadcrumb          = useBreadcrumb();
  const [themeOpen, setThemeOpen] = useState(false);
  const name  = user?.displayName ?? "User";
  const email = user?.email ?? "";
  const ab    = initials(name) || "WA";

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[64px] w-full items-center gap-2 sm:gap-4 border-b border-border bg-card px-3 sm:px-6">

        {/* Mobile menu trigger — sidebar is off-canvas below the lg breakpoint */}
        <button
          onClick={toggleMobileSidebar}
          aria-label="Open menu"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all lg:hidden"
        >
          <Menu size={17} />
        </button>

        {/* Page title */}
        <h1 className="text-base sm:text-lg font-bold text-foreground truncate min-w-0">
          {breadcrumb[breadcrumb.length - 1] ?? "Dashboard"}
        </h1>

        <div className="flex-1" />

        {/* Search */}
        <button className="hidden sm:flex items-center gap-2.5 rounded-xl border border-border bg-muted px-3 py-2 text-muted-foreground hover:border-primary/40 transition-all w-52 lg:w-64">
          <Search size={14} />
          <span className="flex-1 text-left text-[13px]">Search task</span>
          <kbd className="rounded-lg border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono">⌘F</kbd>
        </button>

        {/* Mode toggle */}
        <div className="hidden sm:block">
          <ModeToggle />
        </div>

        {/* Color theme picker button */}
        <button
          onClick={() => setThemeOpen(!themeOpen)}
          title="Change color theme"
          className={cn(
            "hidden sm:flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border transition-all",
            themeOpen
              ? "border-primary bg-primary text-white"
              : "border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40"
          )}
        >
          <Palette size={15} />
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all">
          <Bell size={15} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-border">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white shadow-sm ring-2 ring-primary/20">
            {ab}
          </div>
          <div className="hidden md:block">
            <p className="text-[13px] font-semibold text-foreground leading-tight">{name}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{email}</p>
          </div>
        </div>

      </header>

      {/* Theme picker dropdown */}
      {themeOpen && (
        <div className="sticky top-[64px] z-10 border-b border-border bg-card px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Color Theme</p>
              <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
            </div>
            <button onClick={() => setThemeOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
          <ThemePicker />
        </div>
      )}
    </>
  );
}
