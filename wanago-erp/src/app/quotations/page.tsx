import type { Metadata } from "next";
import { QuotationsPage } from "@/modules/quotations/pages/QuotationsPage";

export const metadata: Metadata = { title: "Quotations" };

export default function Page() {
  return <QuotationsPage />;
}
