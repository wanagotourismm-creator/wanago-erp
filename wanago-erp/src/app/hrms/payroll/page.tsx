import type { Metadata } from "next";
import { PayrollPage } from "@/modules/hrms/payroll/pages/PayrollPage";

export const metadata: Metadata = { title: "Payroll" };

export default function Page() {
  return <PayrollPage />;
}
