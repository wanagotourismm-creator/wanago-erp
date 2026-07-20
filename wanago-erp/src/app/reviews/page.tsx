import type { Metadata } from "next";
import { ReputationDashboardPage } from "@/modules/reviews/pages/ReputationDashboardPage";

export const metadata: Metadata = { title: "Reviews & NPS" };

export default function Page() {
  return <ReputationDashboardPage />;
}
