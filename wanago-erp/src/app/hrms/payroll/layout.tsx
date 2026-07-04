import { AppShell } from "@/components/layout/AppShell";

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="hrms-payroll">{children}</AppShell>;
}
