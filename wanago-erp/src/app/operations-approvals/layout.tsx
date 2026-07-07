import { AppShell } from "@/components/layout/AppShell";

export default function OperationsApprovalsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="ops-approvals">{children}</AppShell>;
}
