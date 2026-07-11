import { AppShell } from "@/components/layout/AppShell";

export default function ItineraryBrochuresLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="itinerary-brochures">{children}</AppShell>;
}
