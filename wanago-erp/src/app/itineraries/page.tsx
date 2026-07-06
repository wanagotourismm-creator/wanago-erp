import type { Metadata } from "next";
import { ItinerariesPage } from "@/modules/itineraries/pages/ItinerariesPage";

export const metadata: Metadata = { title: "Itineraries" };

export default function Page() {
  return <ItinerariesPage />;
}
