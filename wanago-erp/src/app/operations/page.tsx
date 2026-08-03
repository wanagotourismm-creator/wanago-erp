import type { Metadata } from "next";
import { TourOperationsPage } from "@/modules/tour-operations/pages/TourOperationsPage";

export const metadata: Metadata = { title: "Tour Operations" };

export default function Page() {
  return <TourOperationsPage />;
}
