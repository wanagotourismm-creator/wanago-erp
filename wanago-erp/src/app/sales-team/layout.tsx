import { AppShell } from "@/components/layout/AppShell";

export default function SalesTeamLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="sales-team">{children}</AppShell>;
}
