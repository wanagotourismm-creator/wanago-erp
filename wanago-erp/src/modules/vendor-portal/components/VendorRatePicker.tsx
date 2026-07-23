"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Tag, Loader2 } from "lucide-react";
import { fetchVendorRates } from "@/modules/vendor-portal/services/vendor-portal.service";
import { filterActiveRates } from "@/modules/vendor-portal/services/vendor-rate-lookup.service";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/helpers";
import type { VendorRate } from "@/modules/vendor-portal/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (rate: VendorRate) => void;
};

// Picker for the honest, small-scope integration described in the
// vendor-rates-into-costing plan: there's no reliable field anywhere
// joining a Quotation line item or Package to a specific VendorRate (both
// serviceName and lineItems[].description are free text), so this is a
// manual browse-and-pick tool, not an auto-fill — staff still judges
// whether a rate applies to what they're pricing.
export function VendorRatePicker({ open, onClose, onSelect }: Props) {
  const { suppliers } = useSuppliers();
  const [rates, setRates] = useState<VendorRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierId, setSupplierId] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchVendorRates().then(setRates).finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const base = showAll ? rates : filterActiveRates(rates, todayIso());
    return supplierId ? base.filter((r) => r.supplierId === supplierId) : base;
  }, [rates, supplierId, showAll]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[80dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Pick a Vendor Rate</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
          <select
            value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-input" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show expired/future too
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 size={20} className="animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No vendor rates found" description='Try a different supplier, or check "Show expired/future too"' icon={<Tag size={24} className="text-muted-foreground" />} />
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { onSelect(r); onClose(); }}
                  className={cn(
                    "w-full rounded-xl border border-border px-3.5 py-2.5 text-left transition-colors",
                    "hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{r.serviceName}</span>
                    <span className="text-sm font-semibold text-foreground">{formatINR(r.rateAmount)} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span></span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.supplierName}
                    {(r.validFrom || r.validTo) && ` · Valid ${r.validFrom ?? "—"} to ${r.validTo ?? "—"}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
