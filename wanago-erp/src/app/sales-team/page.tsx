import type { Metadata } from "next";
import { SalesTeamPage } from "@/modules/sales-team/pages/SalesTeamPage";

export const metadata: Metadata = { title: "Sales Team Performance" };

export default function Page() {
  return <SalesTeamPage />;
}
