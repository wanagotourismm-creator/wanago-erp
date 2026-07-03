import type { Metadata } from "next";
import { LeadsPage } from "@/modules/leads/pages/LeadsPage";

export const metadata: Metadata = { title: "Leads" };

export default function Page() {
  return <LeadsPage />;
}
