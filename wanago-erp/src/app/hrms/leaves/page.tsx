import type { Metadata } from "next";
import { LeavesPage } from "@/modules/hrms/leaves/pages/LeavesPage";

export const metadata: Metadata = { title: "Leaves" };

export default function Page() {
  return <LeavesPage />;
}
