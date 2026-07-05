"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileMenuSheet } from "@/components/layout/MobileMenuSheet";
import { RouteGuard } from "@/components/providers/RouteGuard";
import { TeamSpacePanel } from "@/modules/teamspace/components/TeamSpacePanel";
import { cn } from "@/lib/utils/helpers";

type Props = {
  children:     React.ReactNode;
  requiredPage?: string | string[];
};

export function AppShell({ children, requiredPage }: Props) {
  return (
    <RouteGuard requiredPage={requiredPage}>
      <div className="flex h-screen w-full overflow-hidden bg-background">

        {/* Sidebar — desktop only (lg+) */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            "scrollbar-thin"
          )}>
            <div className="page-enter p-3 pb-24 sm:p-6 lg:pb-6">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile/tablet navigation — bottom tab bar + full-screen menu, replaces the sidebar below lg */}
        <MobileBottomNav />
        <MobileMenuSheet />

        <TeamSpacePanel />

      </div>
    </RouteGuard>
  );
}
