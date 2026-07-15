import type { Metadata } from "next";
import { InsightsPage } from "@/modules/digests/pages/InsightsPage";

export const metadata: Metadata = { title: "AI Insights" };

export default function Page() {
  return <InsightsPage />;
}
