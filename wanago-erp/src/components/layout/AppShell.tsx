"use client";

import { TopNav } from "@/components/layout/TopNav";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileMenuSheet } from "@/components/layout/MobileMenuSheet";
import { RouteGuard } from "@/components/providers/RouteGuard";
import { TeamSpacePanel } from "@/modules/teamspace/components/TeamSpacePanel";
import { cn } from "@/lib/utils/helpers";

type Props = {
  children:     React.ReactNode;
  requiredPage?: string | string[];
  // Skips the default content padding/max-width for pages (like the HR
  // shells) that manage their own full-bleed nav-rail layout instead of
  // sitting as a card inside the normal page gutter.
  fullBleed?: boolean;
};

export function AppShell({ children, requiredPage, fullBleed }: Props) {
  return (
    <RouteGuard requiredPage={requiredPage}>
      <div className="flex min-h-screen w-full flex-col bg-background">

        <TopNav />
        <Breadcrumb />

        <main className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          "scrollbar-thin"
        )}>
          <div className={cn("page-enter", fullBleed ? "pb-16 lg:pb-0" : "p-3 pb-24 sm:p-6 lg:pb-6 xl:p-8")}>
            {children}
          </div>
        </main>

        {/* Mobile/tablet navigation — bottom tab bar + full-screen menu */}
        <MobileBottomNav />
        <MobileMenuSheet />

        <TeamSpacePanel />

      </div>
    </RouteGuard>
  );
}
