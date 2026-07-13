import { AppShell } from "@/components/layout/AppShell";

export default function HrPoliciesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="hrms-policies">{children}</AppShell>;
}
