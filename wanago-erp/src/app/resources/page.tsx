import type { Metadata } from "next";
import { ResourcesPage } from "@/modules/resources/pages/ResourcesPage";

export const metadata: Metadata = { title: "Resources & Availability" };

export default function Page() {
  return <ResourcesPage />;
}
