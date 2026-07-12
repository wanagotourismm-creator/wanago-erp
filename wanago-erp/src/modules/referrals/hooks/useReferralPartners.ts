"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchReferralPartners, createReferralPartner, updateReferralPartner, deleteReferralPartner,
} from "@/modules/referrals/services/referral-partner.service";
import { useAuthStore } from "@/store/auth.store";
import type { ReferralPartner, ReferralPartnerFormData } from "@/modules/referrals/types";

export function useReferralPartners() {
  const [partners, setPartners] = useState<ReferralPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPartners(await fetchReferralPartners());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addPartner(data: ReferralPartnerFormData): Promise<{ error: string | null }> {
    try {
      const partner = await createReferralPartner(data, user?.uid ?? "");
      setPartners(prev => [partner, ...prev]);
      return { error: null };
    } catch {
      return { error: "Failed to add referral executive" };
    }
  }

  async function editPartner(id: string, data: Partial<ReferralPartnerFormData>): Promise<{ error: string | null }> {
    try {
      await updateReferralPartner(id, data);
      setPartners(prev => prev.map(p => p.id === id ? { ...p, ...data } as ReferralPartner : p));
      return { error: null };
    } catch {
      return { error: "Failed to update referral executive" };
    }
  }

  async function removePartner(id: string): Promise<{ error: string | null }> {
    try {
      await deleteReferralPartner(id);
      setPartners(prev => prev.filter(p => p.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to delete referral executive" };
    }
  }

  return { partners, loading, load, addPartner, editPartner, removePartner };
}
