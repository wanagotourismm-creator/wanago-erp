"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, Sun, Moon, Monitor, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { cn, initials } from "@/lib/utils/helpers";
import { SYSTEM_ROLE_LABELS } from "@/lib/constants";

// ── Breadcrumb from pathname ──────────────────────────────────
function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg) =>
    seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// ── Theme toggle ──────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light",  Icon: Sun     },
    { value: "dark",   Icon: Moon    },
    { value: "system", Icon: Monitor },
  ] as const;

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {options.map(({ value, Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={`${value} mode`}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const breadcrumb = useBreadcrumb();

  return (
    <header className={cn(
      "sticky top-0 z-20 flex h-14 w-full flex-shrink-0 items-center gap-4",
      "border-b border-border bg-background/95 backdrop-blur-sm px-4"
    )}>

      {/* Mobile menu toggle */}
      <button
        onClick={toggleSidebar}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <span className={cn(
              "truncate",
              i === breadcrumb.length - 1
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            )}>
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <button className={cn(
        "hidden sm:flex items-center gap-2 rounded-lg border border-input bg-muted",
        "px-3 py-1.5 text-sm text-muted-foreground",
        "hover:border-primary/50 hover:text-foreground transition-colors",
        "w-48 lg:w-64"
      )}>
        <Search size={14} />
        <span className="flex-1 text-left text-xs">Search...</span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <Bell size={16} />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
      </button>

      {/* User avatar */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {user?.displayName ? initials(user.displayName) : "?"}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-xs font-medium text-foreground leading-tight">
            {user?.displayName ?? "User"}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {user?.systemRole ? SYSTEM_ROLE_LABELS[user.systemRole] : ""}
          </p>
        </div>
      </div>

    </header>
  );
}
