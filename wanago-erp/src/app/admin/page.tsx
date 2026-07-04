import type { Metadata } from "next";
import { AdminPage } from "@/modules/admin/pages/AdminPage";

export const metadata: Metadata = { title: "Admin" };

export default function Page() {
  return <AdminPage />;
}
