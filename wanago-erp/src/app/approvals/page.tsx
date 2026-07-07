import type { Metadata } from "next";
import { ApprovalsPage } from "@/modules/approvals/pages/ApprovalsPage";

export const metadata: Metadata = { title: "Approvals" };

export default function Page() {
  return <ApprovalsPage />;
}
