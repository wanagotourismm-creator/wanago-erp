import { AppShell } from "@/components/layout/AppShell";

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="performance">{children}</AppShell>;
}
