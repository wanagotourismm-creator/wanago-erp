"use client";

import { useState } from "react";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import { useOffers } from "@/modules/admin/offers/hooks/useOffers";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, cn } from "@/lib/utils/helpers";
import { useAuthStore } from "@/store/auth.store";

const inputClass = cn(
  "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary"
);

// The only admin UI for the `offers` collection — the one place a real
// discount/promotion is defined. The customer-facing WhatsApp AI and the
// campaign-drafting AI tool only ever mention what's active here; there is
// no other "discount" concept anywhere else in the app.
export function OffersPanel() {
  const { offers, loading, addOffer, toggleOfferActive, removeOffer } = useOffers();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!title || !description || !validFrom || !validTo) {
      setError("Title, description, and both dates are required.");
      return;
    }
    if (validTo < validFrom) {
      setError("Valid-to date must be on or after the valid-from date.");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      const result = await addOffer({
        title, description, destination: destination.trim() || null,
        validFrom, validTo, isActive: true, createdBy: user?.uid ?? "",
      });
      if (result.error) { setError(result.error); return; }
      setTitle(""); setDescription(""); setDestination(""); setValidFrom(""); setValidTo("");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string, offerTitle: string) {
    if (!confirm(`Delete offer "${offerTitle}"?`)) return;
    await removeOffer(id);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Add Offer</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Real, structured offers only — this is the one place the AI (WhatsApp auto-reply and campaign drafting)
          is allowed to pull a discount from. It never mentions anything not listed here, and never one outside its
          valid dates.
        </p>
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
            <input className={inputClass} placeholder="e.g. Early Bird Goa Special" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Destination (optional)</label>
            <input className={inputClass} placeholder="Leave blank for all destinations" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea rows={2} className={cn(inputClass, "w-full resize-none")} placeholder="e.g. 10% off packages booked 60+ days in advance" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Valid From</label>
            <input type="date" className={inputClass} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Valid To</label>
            <input type="date" className={inputClass} value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Offer
          </button>
        </div>
      </div>

      {loading ? <SkeletonTable rows={4} /> : offers.length === 0 ? (
        <EmptyState title="No offers yet" description="Add one above so the AI can honestly mention real discounts" icon={<span className="text-2xl">🏷️</span>} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {offers.map((o) => {
            const expired = o.validTo < today;
            return (
              <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{o.title}</p>
                    {expired && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Expired</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{o.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {o.destination ?? "All destinations"} · {formatDate(o.validFrom)} – {formatDate(o.validTo)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={o.isActive}
                      onChange={(e) => toggleOfferActive(o.id, e.target.checked)}
                    />
                    Active
                  </label>
                  <button
                    onClick={() => handleDelete(o.id, o.title)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
