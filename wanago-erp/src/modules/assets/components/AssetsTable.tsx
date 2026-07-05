"use client";

import { Edit2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import type { Asset } from "@/modules/assets/types";

export const CONDITION_STYLES: Record<string, string> = {
  good:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  fair:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  damaged: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

type Props = {
  assets: Asset[];
  loading: boolean;
  onView: (a: Asset) => void;
  onEdit: (a: Asset) => void;
  onDelete: (a: Asset) => void;
};

export function AssetsTable({ assets, loading, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;
  if (assets.length === 0) return <EmptyState title="No assets registered yet" description="Add company equipment, ID cards, and more" icon={<span className="text-2xl">💻</span>} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Asset", "Category", "Serial No.", "Condition", "Assigned To", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.map((a) => (
              <tr key={a.id} onClick={() => onView(a)} className="cursor-pointer hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.serialNumber || "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", CONDITION_STYLES[a.condition])}>
                    {a.condition}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.assignedToName || "Unassigned"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(a); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Edit2 size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(a); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
