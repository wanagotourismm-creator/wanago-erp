import type { Metadata } from "next";
import { HrOverviewPage } from "@/modules/hrms/overview/pages/HrOverviewPage";

export const metadata: Metadata = { title: "HR Overview" };

export default function Page() {
  return <HrOverviewPage />;
}
