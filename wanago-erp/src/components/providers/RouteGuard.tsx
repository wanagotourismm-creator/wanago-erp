"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import type { SystemRole } from "@/types/rbac";
import { canAccessPage } from "@/lib/rbac";

type Props = {
  children: React.ReactNode;
  requiredPage?: string;
};

export function RouteGuard({ children, requiredPage }: Props) {
  const { user, initialized } = useAuthStore();
  const router = useRouter();

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

  return <>{children}</>;
}
