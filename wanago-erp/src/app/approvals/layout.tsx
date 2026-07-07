import { AppShell } from "@/components/layout/AppShell";

export default function ApprovalsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="approvals">{children}</AppShell>;
}
