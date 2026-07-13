import { AppShell } from "@/components/layout/AppShell";

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="intake">{children}</AppShell>;
}
