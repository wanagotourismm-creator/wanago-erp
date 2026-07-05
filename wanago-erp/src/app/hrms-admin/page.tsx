import type { Metadata } from "next";
import { HrAdminPage } from "@/modules/hrms/admin/pages/HrAdminPage";

export const metadata: Metadata = { title: "HR Admin" };

export default function Page() {
  return <HrAdminPage />;
}
