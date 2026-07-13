"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { usePortalAuth } from "@/modules/portal/hooks/usePortalAuth";
import { portalLogout, type PortalType } from "@/modules/portal/services/portal-auth.service";

type Props = {
  requiredType: PortalType;
  title: string;
  children: React.ReactNode;
};

// Shared guard + header for both portal dashboards — redirects to login if
// not signed in, or if signed in as the wrong portal type (a customer
// hitting /portal/partner, say).
export function PortalShell({ requiredType, title, children }: Props) {
  const router = useRouter();
  const { loading, signedIn, portalType } = usePortalAuth();

  useEffect(() => {
    if (!loading && (!signedIn || portalType !== requiredType)) {
      router.replace(`/portal/login?type=${requiredType}`);
    }
  }, [loading, signedIn, portalType, requiredType, router]);

  async function handleLogout() {
    await portalLogout();
    router.replace("/portal/login");
  }

  if (loading || !signedIn || portalType !== requiredType) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/images/logo-dark-clean.png" alt="Wanago" className="h-6 w-auto dark:hidden" />
            <img src="/images/logo-white-clean.png" alt="Wanago" className="hidden h-6 w-auto dark:block" />
            <span className="text-xs font-semibold text-muted-foreground">{title}</span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6">
        {children}
      </div>
    </div>
  );
}
