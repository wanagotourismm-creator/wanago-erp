"use client";

import { usePathname } from "next/navigation";

function useBreadcrumbSegments() {
  const pathname = usePathname();
  return pathname.split("/").filter(Boolean).map((s) =>
    s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function Breadcrumb() {
  const segments = useBreadcrumbSegments();
  const page = segments[segments.length - 1] ?? "Dashboard";

  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground sm:px-6">
      <span>Portal</span>
      <span className="text-muted-foreground/50">/</span>
      <span className="font-medium text-foreground">{page}</span>
    </div>
  );
}
