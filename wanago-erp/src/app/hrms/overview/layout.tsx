import { AppShell } from "@/components/layout/AppShell";

export default function HrOverviewLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="hrms-overview" fullBleed>{children}</AppShell>;
}
