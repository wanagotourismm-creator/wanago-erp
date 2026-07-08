"use client";

import { useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileMenuSheet } from "@/components/layout/MobileMenuSheet";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { RouteGuard } from "@/components/providers/RouteGuard";
import { TeamSpacePanel } from "@/modules/teamspace/components/TeamSpacePanel";
import { AIAssistantPanel } from "@/modules/aiassistant/components/AIAssistantPanel";
import { PendingNotificationsModal } from "@/modules/notifications/components/PendingNotificationsModal";
import { TrainingWalkthroughOverlay } from "@/modules/onboarding-training/components/TrainingWalkthroughOverlay";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { startPresenceHeartbeat } from "@/lib/presence";
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
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const prevCollapsedRef = useRef(useUIStore.getState().sidebarCollapsed);
  const { user } = useAuthStore();

  // Heartbeat while any authenticated page is open (not just Team Space) so
  // "online" reflects actual app usage. Restarts on every route change
  // (this component remounts per top-level segment) — harmless, it's just
  // re-establishing the same interval.
  useEffect(() => {
    if (!user) return;
    return startPresenceHeartbeat(user.uid);
  }, [user]);

  // Pages with their own secondary nav rail (fullBleed) auto-collapse the
  // main sidebar to avoid two side-by-side nav columns — restoring
  // whatever it was set to once you navigate away. The sidebar itself
  // stays hoverable/peekable while collapsed (see Sidebar.tsx).
  useEffect(() => {
    if (!fullBleed) return;
    prevCollapsedRef.current = useUIStore.getState().sidebarCollapsed;
    setSidebarCollapsed(true);
    return () => setSidebarCollapsed(prevCollapsedRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullBleed]);

  return (
    <RouteGuard requiredPage={requiredPage}>
      <div className="flex h-screen w-full overflow-hidden bg-background">

        {/* Sidebar — desktop only (lg+) */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <OfflineBanner />
          <TopNav />
          <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            "scrollbar-thin"
          )}>
            <div className={cn("page-enter", fullBleed ? "pb-16 lg:pb-0" : "p-3 pb-24 sm:p-6 lg:pb-6")}>
              {children}
            </div>
          </main>
        </div>

        {/* Mobile/tablet navigation — bottom tab bar + full-screen menu, replaces the sidebar below lg */}
        <MobileBottomNav />
        <MobileMenuSheet />

        <TeamSpacePanel />
        <AIAssistantPanel />
        <PendingNotificationsModal />
        <TrainingWalkthroughOverlay />

      </div>
    </RouteGuard>
  );
}
