import type { Metadata } from "next";
import { ReferralProgramPage } from "@/modules/referrals/pages/ReferralProgramPage";

export const metadata: Metadata = { title: "Referral Program" };

export default function Page() {
  return <ReferralProgramPage />;
}
