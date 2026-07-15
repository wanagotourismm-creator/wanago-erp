import { AppShell } from "@/components/layout/AppShell";

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="insights">{children}</AppShell>;
}
