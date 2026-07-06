import type { Metadata } from "next";
import { IncentivesPage } from "@/modules/incentives/pages/IncentivesPage";

export const metadata: Metadata = { title: "Incentives" };

export default function Page() {
  return <IncentivesPage />;
}
