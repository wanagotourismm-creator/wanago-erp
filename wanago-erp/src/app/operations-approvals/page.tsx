import type { Metadata } from "next";
import { OperationsApprovalsPage } from "@/modules/approvals/pages/OperationsApprovalsPage";

export const metadata: Metadata = { title: "Operations Approvals" };

export default function Page() {
  return <OperationsApprovalsPage />;
}
