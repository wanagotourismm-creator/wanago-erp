import { AppShell } from "@/components/layout/AppShell";

export default function TeamPulseLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="team-pulse">{children}</AppShell>;
}
