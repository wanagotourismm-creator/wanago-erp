"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { RouteGuard } from "@/components/providers/RouteGuard";
import { TeamSpacePanel } from "@/modules/teamspace/components/TeamSpacePanel";
import { cn } from "@/lib/utils/helpers";

type Props = {
  children:     React.ReactNode;
  requiredPage?: string;
};

export function AppShell({ children, requiredPage }: Props) {
  return (
    <RouteGuard requiredPage={requiredPage}>
      <div className="flex h-screen w-full overflow-hidden bg-background">

        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            "scrollbar-thin"
          )}>
            <div className="page-enter p-6">
              {children}
            </div>
          </main>
        </div>

        <TeamSpacePanel />

      </div>
    </RouteGuard>
  );
}
