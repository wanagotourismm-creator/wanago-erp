import type { Metadata } from "next";
import { VendorRatesPage } from "@/modules/vendor-portal/pages/VendorRatesPage";

export const metadata: Metadata = { title: "Vendor Rates & Availability" };

export default function Page() {
  return <VendorRatesPage />;
}
