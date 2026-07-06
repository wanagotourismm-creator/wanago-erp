import { AppShell } from "@/components/layout/AppShell";

export default function IncentivesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="incentives">{children}</AppShell>;
}
