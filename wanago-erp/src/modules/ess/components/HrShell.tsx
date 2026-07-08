"use client";

import { cn } from "@/lib/utils/helpers";

export type HrNavItem = { key: string; label: string; icon: React.ElementType; badge?: number };
export type HrNavGroup = { label: string; items: HrNavItem[] };

type Props = {
  navGroups: HrNavGroup[];
  activeKey: string;
  onNavigate: (key: string) => void;
  headerTitle: React.ReactNode;
  headerSubtitle: React.ReactNode;
  headerRight?: React.ReactNode;
  headerIcon?: React.ElementType;
  children: React.ReactNode;
};

// Shared shell for My HR, HR Overview, and HR Admin — a full-bleed
// nav-rail layout (used with AppShell's fullBleed) that fills the content
// area edge-to-edge instead of floating as a bordered card inside the
// normal page gutter, using the app's own light card/border/primary-accent
// conventions (same language as the main Sidebar's nav links).
export function HrShell({ navGroups, activeKey, onNavigate, headerTitle, headerSubtitle, headerRight, headerIcon: HeaderIcon, children }: Props) {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-card lg:min-h-[calc(100vh-64px)]">

      {/* Header */}
      <div data-tour-id="tour-hrshell-header" className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          {HeaderIcon && (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <HeaderIcon size={19} className="text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">{headerTitle}</h1>
            <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">

        {/* Nav rail — sticky + independently scrollable on desktop, like the main sidebar, so it doesn't get cut off when there are more tools than fit on screen */}
        <nav className="flex flex-shrink-0 gap-4 overflow-x-auto border-b border-border bg-muted/20 p-3 lg:sticky lg:top-0 lg:max-h-[calc(100vh-64px)] lg:w-56 lg:flex-col lg:gap-5 lg:self-start lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label || "root"} className="flex flex-shrink-0 flex-col gap-1">
              {group.label && (
                <p className="hidden px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 lg:block">{group.label}</p>
              )}
              <div className="flex gap-1 lg:flex-col">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onNavigate(item.key)}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      activeKey === item.key
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon size={16} className="flex-shrink-0" />
                    {item.label}
                    {!!item.badge && (
                      <span className={cn(
                        "ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        activeKey === item.key ? "bg-white/25 text-white" : "bg-primary text-white"
                      )}>
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 bg-background p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
