import type { Metadata } from "next";
import { JourneysPage } from "@/modules/journeys/pages/JourneysPage";

export const metadata: Metadata = { title: "Marketing Automation" };

export default function Page() {
  return <JourneysPage />;
}
