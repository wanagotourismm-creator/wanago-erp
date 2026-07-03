"use client";

import { Sidebar }    from "@/components/layout/Sidebar";
import { Header }     from "@/components/layout/Header";
import { RouteGuard } from "@/components/providers/RouteGuard";

type Props = { children: React.ReactNode; requiredPage?: string };

export function AppShell({ children, requiredPage }: Props) {
  return (
    <RouteGuard requiredPage={requiredPage}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
            <div className="page-enter p-6 max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
