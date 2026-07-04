import type { Metadata } from "next";
import { InvoicesPage } from "@/modules/invoices/pages/InvoicesPage";

export const metadata: Metadata = { title: "Invoices" };

export default function Page() {
  return <InvoicesPage />;
}
