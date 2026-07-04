import type { Metadata } from "next";
import { PaymentsPage } from "@/modules/payments/pages/PaymentsPage";

export const metadata: Metadata = { title: "Payments" };

export default function Page() {
  return <PaymentsPage />;
}
