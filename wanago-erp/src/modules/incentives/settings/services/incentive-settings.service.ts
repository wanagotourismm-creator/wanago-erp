import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { IncentiveSettings } from "@/modules/incentives/settings/types";

const DOC_ID = "incentives";

// PDF: wanago Tours & Travels Sales Incentive Structure — these are the
// values from the document itself, used only until an admin edits them.
export const DEFAULT_INCENTIVE_SETTINGS: IncentiveSettings = {
  baseIncentiveEnabled: true,
  minEligibilityPct:    50,
  tier1MaxPct:          70,
  tier1RatePercent:     4,
  tier2MaxPct:          90,
  tier2RatePercent:     6,
  tier3MaxPct:          100,
  tier3RatePercent:     8,
  tier4RatePercent:     10,

  defaultMonthlyProfitTarget: 20000,

  fastClosureBonusEnabled: true,
  fastClosure24hBonus:     300,
  fastClosure48hBonus:     150,

  highValueBonusEnabled: true,
  highValueThreshold:    15000,
  highValueBonusAmount:  500,

  selfGeneratedBonusEnabled: true,
  selfGeneratedBonusPercent: 2,

  teamBonusEnabled:  true,
  teamBonusPercent:  2,
  teamMonthlyTarget: 500000,

  monthlyRewardsEnabled: true,
  monthlyReward1Amount:  3000,
  monthlyReward2Amount:  2000,
  monthlyReward3Amount:  1000,

  quarterlyRewardsEnabled:   true,
  quarterlyRewardCashAmount: 10000,
  quarterlyRewardNote:       "Sponsored Trip / ₹10,000 Cash",
};

export async function fetchIncentiveSettings(): Promise<IncentiveSettings> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_INCENTIVE_SETTINGS;
  return { ...DEFAULT_INCENTIVE_SETTINGS, ...snap.data() } as IncentiveSettings;
}

export async function updateIncentiveSettings(
  data: IncentiveSettings,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}
