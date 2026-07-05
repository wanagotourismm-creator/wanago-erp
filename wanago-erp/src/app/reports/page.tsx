import type { Metadata } from "next";
import { ReportsPage } from "@/modules/reports/pages/ReportsPage";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return <ReportsPage />;
}
