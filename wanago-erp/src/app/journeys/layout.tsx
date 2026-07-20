import { AppShell } from "@/components/layout/AppShell";

export default function JourneysLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="journeys">{children}</AppShell>;
}
