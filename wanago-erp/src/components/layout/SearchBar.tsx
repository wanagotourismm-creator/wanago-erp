"use client";

import { Search } from "lucide-react";

// A real, focusable/typeable input — no search backend exists or is being
// built here; this only replaces the previous decorative button stub.
export function SearchBar() {
  return (
    <div className="hidden items-center gap-2.5 rounded-full border border-border bg-muted px-3.5 py-2 text-muted-foreground transition-all focus-within:border-primary/40 sm:flex sm:w-48 lg:w-64">
      <Search size={14} className="flex-shrink-0" />
      <input
        type="text"
        placeholder="Search..."
        className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
