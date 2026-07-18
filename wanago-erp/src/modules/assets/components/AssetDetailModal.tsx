"use client";

import { X, Edit2, Trash2, Laptop, User, Tag } from "lucide-react";
import { formatDate, cn } from "@/lib/utils/helpers";
import { CONDITION_STYLES } from "@/modules/assets/components/AssetsTable";
import type { Asset } from "@/modules/assets/types";

type Props = {
  asset:    Asset | null;
  onClose:  () => void;
  onEdit:   (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function AssetDetailModal({ asset, onClose, onEdit, onDelete }: Props) {
  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              <Laptop size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{asset.name}</h2>
              <p className="text-xs text-muted-foreground">{asset.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", CONDITION_STYLES[asset.condition])}>
              {asset.condition}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Tag size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Category" value={asset.category} />
              <Row label="Serial Number" value={asset.serialNumber} />
              <Row label="Condition" value={asset.condition} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Assignment</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Assigned To" value={asset.assignedToName ?? "Unassigned"} />
              <Row label="Assigned Date" value={asset.assignedDate ? formatDate(asset.assignedDate) : null} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button
            onClick={() => onEdit(asset)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(asset)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>

      </div>
    </div>
  );
}
