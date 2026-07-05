"use client";

import { Laptop, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatDate } from "@/lib/utils/helpers";
import type { Asset, AssetRequest } from "@/modules/assets/types";

const CONDITION_STYLES: Record<string, string> = {
  good:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  fair:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  damaged: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

type Props = {
  assets: Asset[];
  assetRequests: AssetRequest[];
  onRequest: () => void;
};

export function MyAssetsList({ assets, assetRequests, onRequest }: Props) {
  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Laptop size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">My Assets</p>
            <p className="text-xs text-muted-foreground">{assets.length} assigned to you</p>
          </div>
        </div>
        <button onClick={onRequest}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm">
          <Plus size={13} /> Request
        </button>
      </div>

      {assets.length === 0 ? (
        <EmptyState title="No assets assigned yet" description="Equipment and ID cards assigned to you will show here" icon={<span className="text-2xl">💻</span>} />
      ) : (
        <div className="space-y-2 mb-4">
          {assets.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.category}{a.serialNumber ? ` · ${a.serialNumber}` : ""}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", CONDITION_STYLES[a.condition])}>{a.condition}</span>
            </div>
          ))}
        </div>
      )}

      {assetRequests.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1.5">My Requests</p>
          <div className="space-y-1.5">
            {assetRequests.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                <span className="text-muted-foreground">{r.assetCategory} · {formatDate(r.createdAt)}</span>
                <span className={cn("rounded-full px-2 py-0.5 font-medium", REQUEST_STATUS_STYLES[r.requestStatus])}>{r.requestStatus}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
