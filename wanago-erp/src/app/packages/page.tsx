import type { Metadata } from "next";
import { PackagesPage } from "@/modules/packages/pages/PackagesPage";

export const metadata: Metadata = { title: "Packages" };

export default function Page() {
  return <PackagesPage />;
}
