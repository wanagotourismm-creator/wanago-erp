import type { Metadata } from "next";
import { CampaignsPage } from "@/modules/campaigns/pages/CampaignsPage";

export const metadata: Metadata = { title: "Campaigns" };

export default function Page() {
  return <CampaignsPage />;
}
