import { AppShell } from "@/components/layout/AppShell";

export default function LeavesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="hrms-leaves">{children}</AppShell>;
}
