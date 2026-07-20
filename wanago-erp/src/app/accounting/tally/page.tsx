import type { Metadata } from "next";
import { TallyExportPage } from "@/modules/accounting/tally/pages/TallyExportPage";

export const metadata: Metadata = { title: "Tally Export" };

export default function Page() {
  return <TallyExportPage />;
}
