"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/DropdownMenu";
import { useVisibleNavGroups } from "@/components/layout/useVisibleNavGroups";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { PILL_NAV } from "@/components/layout/pill-nav-config";
import { cn } from "@/lib/utils/helpers";
import type { NavItem } from "@/components/layout/nav-config";

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavPills() {
  const pathname = usePathname();
  const visibleGroups = useVisibleNavGroups();

  const pills = PILL_NAV.map((pill) => {
    const items: NavItem[] = pill.groupNames.length > 0
      ? visibleGroups.filter((g) => pill.groupNames.includes(g.group)).flatMap((g) => g.items)
      : [];
    return { ...pill, items };
  }).filter((pill) => pill.directHref || pill.items.length > 0);

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {pills.map((pill) => {
        if (pill.directHref) {
          const active = isItemActive(pathname, pill.directHref);
          return (
            <Link
              key={pill.label}
              href={pill.directHref}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                active ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {pill.label}
            </Link>
          );
        }

        const active = pill.items.some((item) => isItemActive(pathname, item.href));

        return (
          <DropdownMenu key={pill.label}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap outline-none",
                  active ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {pill.label}
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {pill.items.map((item) => {
                const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <Icon size={16} className="flex-shrink-0" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}
