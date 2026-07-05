"use client";

import { useState } from "react";
import { Plus, RefreshCw, Check, X as XIcon, Loader2 } from "lucide-react";
import { useAssets } from "@/modules/assets/hooks/useAssets";
import { AssetForm } from "@/modules/assets/components/AssetForm";
import { AssetsTable } from "@/modules/assets/components/AssetsTable";
import { AssetDetailModal } from "@/modules/assets/components/AssetDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/utils/helpers";
import type { Asset } from "@/modules/assets/types";

export function AssetsPanel() {
  const { assets, pendingRequests, loading, load, addAsset, editAsset, removeAsset, decideRequest } = useAssets();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [viewing, setViewing] = useState<Asset | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDecide(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    await decideRequest(id, decision);
    setBusyId(null);
  }

  function handleEdit(a: Asset) {
    setViewing(null);
    setEditing(a);
    setFormOpen(true);
  }

  function handleDelete(a: Asset) {
    if (!confirm(`Delete asset "${a.name}"?`)) return;
    setViewing(null);
    removeAsset(a.id);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Assets" description={`${assets.length} registered · ${pendingRequests.length} pending requests`}
        actions={<>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Asset</Button>
        </>} />

      {pendingRequests.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-3">Pending Asset Requests</p>
          <div className="space-y-2">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.employeeName} · {r.assetCategory}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.reason} · {formatDate(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {busyId === r.id ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <button onClick={() => handleDecide(r.id, "approve")} className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"><Check size={15} /></button>
                      <button onClick={() => handleDecide(r.id, "reject")} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"><XIcon size={15} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {assets.length === 0 && !loading ? (
        <EmptyState title="No assets registered yet" description="Add company equipment, ID cards, and more" icon={<span className="text-2xl">💻</span>} />
      ) : (
        <AssetsTable
          assets={assets}
          loading={loading}
          onView={setViewing}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <AssetDetailModal
        asset={viewing ? assets.find(a => a.id === viewing.id) ?? viewing : null}
        onClose={() => setViewing(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AssetForm
        open={formOpen}
        asset={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={async (data) => {
          if (editing) await editAsset(editing.id, data);
          else await addAsset(data);
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
