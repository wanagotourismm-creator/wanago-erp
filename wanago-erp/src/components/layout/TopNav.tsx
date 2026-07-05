"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, Mail } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useTeamSpaceUIStore } from "@/store/teamspace-ui.store";
import { NavPills } from "@/components/layout/NavPills";
import { SearchBar } from "@/components/layout/SearchBar";
import { UserMenu } from "@/components/layout/UserMenu";
import { NotificationBell } from "@/components/layout/NotificationBell";

export function TopNav() {
  const { toggleMobileSidebar } = useUIStore();
  const { openPanel } = useTeamSpaceUIStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full flex-shrink-0 items-center gap-2 border-b border-border bg-card px-3 shadow-nav sm:gap-4 sm:px-6">

      {/* Mobile menu trigger */}
      <button
        onClick={toggleMobileSidebar}
        aria-label="Open menu"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all lg:hidden"
      >
        <Menu size={17} />
      </button>

      {/* Logo */}
      <Link href="/dashboard" className="relative hidden h-9 w-[140px] flex-shrink-0 lg:block">
        <Image
          src={isDark ? "/images/logo-white-clean.png" : "/images/logo-dark-clean.png"}
          alt="Wanago Travel & Co"
          fill
          className="object-contain object-left"
          priority
          sizes="140px"
        />
      </Link>

      <NavPills />

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
