"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import type { SystemRole } from "@/types/rbac";
import { canAccessPage } from "@/lib/rbac";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";

type Props = {
  children: React.ReactNode;
  requiredPage?: string;
};

export function RouteGuard({ children, requiredPage }: Props) {
  const { user, initialized } = useAuthStore();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState<{ on: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    if (requiredPage && !canAccessPage(user.systemRole as SystemRole, requiredPage)) {
      router.replace("/dashboard");
    }
  }, [user, initialized, router, requiredPage]);

  useEffect(() => {
    if (!user) return;
    fetchCompanySettings()
      .then(s => setMaintenance({ on: s.maintenanceMode, message: s.maintenanceMessage }))
      .catch(() => setMaintenance({ on: false, message: "" }));
  }, [user]);

  // Show nothing while checking auth
  if (!initialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (maintenance?.on && user.systemRole !== "super_admin") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <ShieldAlert size={22} className="text-amber-600" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Under Maintenance</h1>
          <p className="mt-2 text-sm text-muted-foreground">{maintenance.message}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
