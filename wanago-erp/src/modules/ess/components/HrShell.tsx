"use client";

import { HeartHandshake } from "lucide-react";
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
  children: React.ReactNode;
};

// Deliberately distinct visual identity from the rest of the app (which is
// a light, card-based UI) and from the Admin "Command Center" (dark/violet)
// — same dark command-center structure, teal accent, so HRMS reads as its
// own purpose-built product rather than another plain list page.
export function HrShell({ navGroups, activeKey, onNavigate, headerTitle, headerSubtitle, headerRight, children }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-xl">

      {/* Command bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/15 ring-1 ring-teal-500/30">
            <HeartHandshake size={19} className="text-teal-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">HR Command Center</p>
            <h1 className="text-lg font-bold text-white leading-tight">{headerTitle}</h1>
            <p className="text-xs text-slate-400">{headerSubtitle}</p>
          </div>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>

      <div className="flex flex-col lg:flex-row">

        {/* Nav rail */}
        <nav className="flex flex-shrink-0 gap-4 overflow-x-auto border-b border-white/10 bg-slate-950/60 p-3 lg:w-56 lg:flex-col lg:gap-5 lg:overflow-visible lg:border-b-0 lg:border-r">
          {navGroups.map((group) => (
            <div key={group.label || "root"} className="flex flex-shrink-0 flex-col gap-1">
              {group.label && (
                <p className="hidden px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 lg:block">{group.label}</p>
              )}
              <div className="flex gap-1 lg:flex-col">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onNavigate(item.key)}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                      activeKey === item.key
                        ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    <item.icon size={14} />
                    {item.label}
                    {!!item.badge && (
                      <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] font-bold text-white">
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
