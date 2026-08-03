"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchOffers, createOffer, updateOffer, deleteOffer } from "@/modules/admin/offers/services/offer.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Offer, OfferFormData } from "@/modules/admin/offers/types";

export function useOffers() {
  const [offers,  setOffers]  = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try { setOffers(await fetchOffers()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addOffer(data: OfferFormData): Promise<{ error: string | null }> {
    try {
      const offer = await createOffer(data, user?.uid ?? "");
      setOffers((prev) => [offer, ...prev]);
      logActivity({
        entityType: "Offer", entityName: offer.title, action: "created",
        detail: `Added offer "${offer.title}" (${offer.validFrom} to ${offer.validTo})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to add offer" };
    }
  }

  async function toggleOfferActive(id: string, isActive: boolean): Promise<{ error: string | null }> {
    try {
      await updateOffer(id, { isActive });
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, isActive } : o)));
      return { error: null };
    } catch {
      return { error: "Failed to update offer" };
    }
  }

  async function removeOffer(id: string): Promise<{ error: string | null }> {
    try {
      const offer = offers.find((o) => o.id === id);
      await deleteOffer(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      if (offer) {
        logActivity({
          entityType: "Offer", entityName: offer.title, action: "deleted",
          detail: `Deleted offer "${offer.title}"`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete offer" };
    }
  }

  return { offers, loading, load, addOffer, toggleOfferActive, removeOffer };
}
