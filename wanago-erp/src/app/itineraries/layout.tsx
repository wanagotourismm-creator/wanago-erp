import { AppShell } from "@/components/layout/AppShell";

export default function ItinerariesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="itineraries">{children}</AppShell>;
}
