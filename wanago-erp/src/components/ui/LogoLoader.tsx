"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

// Branded full-screen loading state — shown while Firebase auth/session
// resolves on first load of any protected route (see RouteGuard).
export function LogoLoader({ label = "Loading..." }: { label?: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-[190px] animate-wanago-pulse">
          <Image
            src={isDark ? "/images/logo-white-clean.png" : "/images/logo-dark-clean.png"}
            alt="Wanago"
            fill
            priority
            className="object-contain"
          />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
