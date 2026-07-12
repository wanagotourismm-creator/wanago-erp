"use client";

import { Search } from "lucide-react";
import { useGlobalSearchUIStore } from "@/store/global-search-ui.store";

export function SearchBar() {
  const openPalette = useGlobalSearchUIStore((s) => s.openPalette);

  return (
    <button
      onClick={openPalette}
      className="hidden items-center gap-2.5 rounded-full border border-border bg-muted px-3.5 py-2 text-muted-foreground transition-all hover:border-primary/40 sm:flex sm:w-48 lg:w-64"
    >
      <Search size={14} className="flex-shrink-0" />
      <span className="flex-1 text-left text-[13px]">Search...</span>
      <kbd className="hidden flex-shrink-0 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 lg:inline-block">
        ⌘K
      </kbd>
    </button>
  );
}
