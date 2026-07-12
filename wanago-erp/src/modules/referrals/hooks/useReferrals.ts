"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchReferralSettings, updateReferralSettings, fetchReferralBonuses, markReferralBonusPaid,
} from "@/modules/referrals/services/referral.service";
import { useAuthStore } from "@/store/auth.store";
import type { ReferralSettings, ReferralBonus } from "@/modules/referrals/types";

export function useReferrals() {
  const [settings, setSettings] = useState<ReferralSettings>({ enabled: false, bonusAmount: 500, partnerBonusAmount: 500 });
  const [bonuses,  setBonuses]  = useState<ReferralBonus[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([fetchReferralSettings(), fetchReferralBonuses()]);
      setSettings(s);
      setBonuses(b);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSettings(next: ReferralSettings): Promise<{ error: string | null }> {
    try {
      await updateReferralSettings(next, user?.uid ?? "");
      setSettings(next);
      return { error: null };
    } catch {
      return { error: "Failed to save referral settings" };
    }
  }

  async function markPaid(id: string): Promise<{ error: string | null }> {
    try {
      await markReferralBonusPaid(id, user?.uid ?? "");
      setBonuses(prev => prev.map(b => b.id === id
        ? { ...b, bonusStatus: "paid", paidBy: user?.uid ?? "", paidAt: new Date().toISOString() }
        : b));
      return { error: null };
    } catch {
      return { error: "Failed to mark bonus as paid" };
    }
  }

  return { settings, bonuses, loading, load, saveSettings, markPaid };
}
