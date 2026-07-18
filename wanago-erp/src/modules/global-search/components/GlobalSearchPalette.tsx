"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search, Loader2, X, Users, UserCheck, CalendarCheck, Map, FileText, UserPlus,
  Receipt, CreditCard, Store, Package, Wallet, Megaphone, UserCircle, Compass,
} from "lucide-react";
import { useGlobalSearchUIStore } from "@/store/global-search-ui.store";
import { useGlobalSearch } from "@/modules/global-search/hooks/useGlobalSearch";
import { SEARCH_ENTITY_LABELS, type SearchEntityType, type SearchResult } from "@/modules/global-search/types";
import { useAuthStore } from "@/store/auth.store";
import { canAccessPage } from "@/lib/rbac";
import { NAV_CONFIG } from "@/components/layout/nav-config";
import type { SystemRole } from "@/types/rbac";

const ENTITY_ICONS: Record<SearchEntityType, React.ElementType> = {
  customer:  UserCheck,
  lead:      Users,
  booking:   CalendarCheck,
  itinerary: Map,
  quotation: FileText,
  candidate: UserPlus,
  invoice:   Receipt,
  payment:   CreditCard,
  supplier:  Store,
  package:   Package,
  expense:   Wallet,
  campaign:  Megaphone,
  employee:  UserCircle,
  page:      Compass,
};

function groupByEntity(results: SearchResult[]): Partial<Record<SearchEntityType, SearchResult[]>> {
  const groups: Partial<Record<SearchEntityType, SearchResult[]>> = {};
  for (const r of results) {
    (groups[r.entityType] ??= []).push(r);
  }
  return groups;
}

export function GlobalSearchPalette() {
  const { open, closePalette, togglePalette } = useGlobalSearchUIStore();
  const { results, loading, ensureIndex } = useGlobalSearch();
  const { user } = useAuthStore();
  const router = useRouter();

  // "Go to page" entries, sourced straight from the same nav config the
  // sidebar renders — same role-gating expression Sidebar.tsx already uses,
  // so the palette never suggests a page the signed-in user can't open.
  const pageResults = useMemo((): SearchResult[] => {
    if (!user) return [];
    const role = user.systemRole as SystemRole;
    return NAV_CONFIG.flatMap((group) => group.items)
      .filter((item) => !item.roles || item.roles.includes(role) || canAccessPage(user, item.href.replace("/", "")))
      .map((item): SearchResult => ({
        id: item.href, entityType: "page",
        title: item.label, subtitle: item.href,
        href: item.href,
      }));
  }, [user]);

  // ⌘K / Ctrl+K opens the palette from anywhere in the app.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [togglePalette]);

  useEffect(() => {
    if (open) ensureIndex();
  }, [open, ensureIndex]);

  if (!open) return null;

  function selectResult(r: SearchResult) {
    closePalette();
    router.push(r.href);
  }

  const grouped = groupByEntity([...pageResults, ...results]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onClick={closePalette}>
      <div
        className="modal-enter w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter loop>
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <Search size={16} className="flex-shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search anything, or jump to a page…"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 size={14} className="flex-shrink-0 animate-spin text-muted-foreground" />}
            <button onClick={closePalette} className="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <X size={15} />
            </button>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto scrollbar-thin p-2">
            <Command.Empty className="px-3 py-8 text-center text-xs text-muted-foreground">
              {loading ? "Loading…" : "No results."}
            </Command.Empty>

            {(Object.keys(grouped) as SearchEntityType[]).map((entityType) => {
              const Icon = ENTITY_ICONS[entityType];
              return (
                <Command.Group
                  key={entityType}
                  heading={SEARCH_ENTITY_LABELS[entityType]}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/60"
                >
                  {grouped[entityType]!.map((r) => (
                    <Command.Item
                      key={r.id}
                      value={`${r.title} ${r.subtitle}`}
                      onSelect={() => selectResult(r)}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm data-[selected=true]:bg-primary/10"
                    >
                      <Icon size={14} className="flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{r.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
