import type { Metadata } from "next";
import { ItineraryBrochuresPage } from "@/modules/itinerary-brochures/pages/ItineraryBrochuresPage";

export const metadata: Metadata = { title: "Itinerary Brochures" };

export default function Page() {
  return <ItineraryBrochuresPage />;
}
