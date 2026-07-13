import type { Metadata } from "next";
import { HrPoliciesPage } from "@/modules/hrms/policies/pages/HrPoliciesPage";

export const metadata: Metadata = { title: "HR Policy Documents" };

export default function Page() {
  return <HrPoliciesPage />;
}
