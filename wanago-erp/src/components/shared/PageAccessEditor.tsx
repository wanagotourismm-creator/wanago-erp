"use client";

import { Layers } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { PAGE_ACCESS, PAGE_LABELS } from "@/lib/rbac";
import type { SystemRole } from "@/types/rbac";

type Props = {
  role:  SystemRole;
  value: string[] | null;
  onChange: (value: string[] | null) => void;
};

// Lets whoever's creating/editing this account narrow which of their
// System Role's own pages they can actually reach — restrict-only, never
// grant: every toggle starts on, so the only action available is turning
// one off. null/absent (the default) means no override — the account gets
// its role's full page list, same as anyone else with that role. Not shown
// for roles whose PAGE_ACCESS is "*" (Admin/Super Admin) — there's no
// finite list to narrow.
export function PageAccessEditor({ role, value, onChange }: Props) {
  const pages = PAGE_ACCESS[role] ?? [];
  if (pages.length === 0 || pages.includes("*")) return null;

  const enabled = value != null;
  const selected = value ?? pages;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked ? [...pages] : null)}
        />
        <Layers size={13} className="text-primary" />
        Customize which tools this employee can use
      </label>

      {enabled && (
        <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2">
          {pages.map((page) => (
            <Switch
              key={page}
              label={PAGE_LABELS[page] ?? page}
              checked={selected.includes(page)}
              onChange={(checked) => {
                onChange(checked ? [...selected, page] : selected.filter((p) => p !== page));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
